// Sign-up key for the users collection (unit VW102, Q-A 3:33.3 "Count per reader, with an app key (VW102)").
//
// Rule: a request that creates a record in the collection users must send the header X-Kendo-Sign-Up-Key with the secret app key.
// The website (route /api/read/sign-up, function pbSignUp in app/lib/pb.ts) sends it. A direct call to PocketBase without the key gets HTTP 403.
// The app sends the same value as the Vercel variable VIEWER_SIGN_UP_KEY.
//
// Server setting (environment of the PocketBase process):
//   SIGN_UP_KEY  the app key, at least 32 characters (hand-steps section 8.6 puts it in the same env file as PAGE_IMAGE_KEY)
//
// Answers:
//   superuser (S2 sync, pb_users.py)     the hook lets the request pass. It checks nothing else.
//   SIGN_UP_KEY empty, missing or short   HTTP 403 for every other request (fail closed). The hook logs one line when PocketBase starts.
//   key header missing or wrong          HTTP 403.
//   key header equal to SIGN_UP_KEY      the hook lets the request pass. The create rule of users (migration 1793300006) still applies.
// The 403 body holds data.signUpKey.code "sign_up_key_refused". The website shows the message "Sign-up is closed on this server. Try again later."
// The hook never writes the key, or the value that a caller sent, to the log or to a response.
//
// Order in PocketBase 0.39.10 (source at tag v0.39.10, apis/record_crud.go): the function recordCreate calls checkCollectionRateLimit (line 220) first
// and triggers OnRecordCreateRequest (line 346) after it. So the rate limit of migration 1793300014 counts a request first, and this hook refuses it after.
// A refused request still counts toward the limit of the address that it names.
// The hook also runs for a create call inside POST /api/batch, because the batch handler calls the same recordCreate function for each sub-request
// (checked by the 8092 test of unit VW102: a batch with no key is refused with the same answer, a batch with the key passes).
// The create rule of users (migration 1793300006) runs before this hook (record_crud.go lines 270 to 329). A request that fails the rule gets HTTP 400, not 403.
// Sources: https://pocketbase.io/docs/js-event-hooks/ (onRecordCreateRequest), https://pocketbase.io/docs/js-routing/ (e.hasSuperuserAuth(),
// e.requestInfo().headers, throw new ForbiddenError). The header name rule is in core/event_request.go lines 135 to 141 ("X-Token" becomes "x_token").
// $security.equal compares two strings in constant time (the hook page_images.pb.js uses it too).
// PocketBase reads this file when it starts with --hooksDir=<folder of this file>.
//
// PocketBase runs each handler in its own context, so a handler cannot see a variable or a function that sits outside it.
// That is why every helper below is inside the handler.

// One line when PocketBase starts. It never shows the key.
{
  const startKey = $os.getenv("SIGN_UP_KEY");
  if (!startKey || startKey.length < 32) {
    console.log("sign_up_key hook: SIGN_UP_KEY is not set or has fewer than 32 characters. Every public sign-up is refused until it is set.");
  } else {
    console.log("sign_up_key hook: SIGN_UP_KEY is set. A public sign-up needs the header X-Kendo-Sign-Up-Key.");
  }
}

onRecordCreateRequest((e) => {
  const MIN_KEY = 32; // characters

  if (e.hasSuperuserAuth()) return e.next();

  const refuse = () =>
    // The data value must be a ValidationError. PocketBase shows any other value as the code "validation_invalid_value"
    // (tools/router/error.go lines 176 to 217, found by the 8092 test of unit VW102). With it, the answer holds data.signUpKey.code "sign_up_key_refused".
    new ForbiddenError("Sign-up is closed on this server.", {
      signUpKey: new ValidationError("sign_up_key_refused", "A sign-up needs the app key of the website."),
    });

  const key = $os.getenv("SIGN_UP_KEY");
  if (!key || key.length < MIN_KEY) throw refuse();

  // A record event has no e.request in the JSVM (the 8092 test of unit VW102 found "Cannot read property 'header' of undefined").
  // e.requestInfo().headers holds the first value of each header. The name is lower case with "_" for "-": X-Kendo-Sign-Up-Key is x_kendo_sign_up_key.
  const sent = e.requestInfo().headers["x_kendo_sign_up_key"];
  if (!sent || !$security.equal(sent, key)) throw refuse();

  return e.next();
}, "users");
