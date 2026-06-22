/**
 * Re-align c6a1c342 "Kendo in the Era of 100-Year Lives (Iwatate Saburo)"
 * Manual merge-map constructed by reading both texts sentence-by-sentence.
 *
 * Usage: npx tsx scripts/realign-iwatate.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(".env.local", "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Merge map — each entry: [jpSentence, enSentence | null]
// Constructed by reading both texts carefully. Null only where EN genuinely
// has no counterpart (content omitted from the English translation).
// ---------------------------------------------------------------------------

const PAIRS: Array<[string, string | null]> = [
  // =========================================================================
  // SECTION: INTRO  (JP para 0 → EN paras 0,1,2)
  // JP: 蹲踞から立ちが上がると初太刀... (6 sentences)
  // EN: 3 paragraphs → 7 sentences. JP1→EN1+2, JP2→EN3, JP3→EN4, JP4→EN5, JP5→EN6, JP6→EN7
  // =========================================================================
  [
    "蹲踞から立ちが上がると初太刀、相手を気と剣で制し、居着つかせた間をストンと面に出る。",
    "Rising from Sonkyo, the first strike is delivered. Controlling the opponent with spirit and sword, creating a moment where they become mentally fixed (itsuku), he smoothly steps in to strike Men.",
  ],
  [
    "スピードがあるわけではないが、竹刀が吸い込まれるように相手の頭上を捉える。",
    "It's not about speed; rather, the Shinai seems to be drawn in, capturing the space above the opponent's head as if by magnetism.",
  ],
  [
    "今年岩立範士は八十三歳を迎えた。",
    "This year, Iwatate Sensei turned 83.",
  ],
  [
    "筋力の衰えは当然の如しだが、相手の心を掴み、気力で乗って打つ剣道に益々磨きをかける。",
    "While a decline in physical strength is only natural, his Kendo, which seizes the opponent's mind and strikes with spirit rather than force, continues to grow more refined.",
  ],
  [
    "脂の乗った若手を最低限の力で遣う姿は剣道の奥義をみるかのようだ。",
    "Watching him skillfully handle strong young opponents with minimal effort is like witnessing the essence of Kendo itself.",
  ],
  [
    "人生百年時代、剣道にその真価を求めるために、範士の剣道人生を振り返ってもらった。",
    "In this era of 100-year lifespans, we asked Iwatate Sensei to reflect on his Kendo journey in pursuit of Kendo's true value.",
  ],

  // =========================================================================
  // NAME HEADING
  // =========================================================================
  ["岩立三郎", "Iwatate Saburo"],

  // =========================================================================
  // BIO  (JP para 2 → EN paras 4,5,6)
  // JP: 8 sentences. EN: 8 sentences across 3 paragraphs.
  // NB: JP sentence 4 (17th WKC) is missing from EN → null.
  // =========================================================================
  [
    "いわたて・さぶろう／昭和14年千葉県生まれ。",
    "Born in 1939 in Chiba Prefecture.",
  ],
  [
    "成田高校卒業後、千葉県警察に奉職する。",
    "After graduating from Narita High School, he joined the Chiba Prefectural Police.",
  ],
  [
    "剣道特練員を退いた後は、関東管区警察学校教官、千葉県警察剣道師範などを歴任。",
    "Following his time as a member of the Tokuren, he went on to serve in various roles, including instructor at the Kanto Regional Police Academy and head Kendo instructor for the Chiba Prefectural Police.",
  ],
  [
    "昭和53年から剣道場「松風館」にて剣道指導をはじめ、現在も岩立範士の指導を請うべく、日本はもとより海外からも多数の剣士が集まっている。",
    "Since 1978, he has been teaching Kendo at his own dojo, Shofukan. Today, many practitioners from both Japan and abroad continue to seek instruction under the Hanshi Sensei.",
  ],
  [
    "第17回世界剣道選手権大会では審判長をつとめた。",
    null, // NOT in English translation
  ],
  [
    "現在、松風館館長、尚美学園大学剣道部師範。",
    "He currently serves as head of Shofukan Dojo and head instructor of the Kendo Club at Shobi University.",
  ],
  [
    "全日本剣道道場連盟副会長、全日本高齢剣友会会長。",
    "He is also Vice President of the All Japan Kendo Dojo Federation and President of the All Japan Senior Kendo Association.",
  ],
  [
    "剣道範士八段。",
    "He holds the rank of Kendo Hanshi 8th Dan.",
  ],

  // =========================================================================
  // SECTION HEADING: 健康に注意して生涯剣道を貫く
  // EN has no heading — just a "****" divider (stripped as junk).
  // =========================================================================
  ["健康に注意して生涯剣道を貫く", null],

  // =========================================================================
  // HEALTH 1 (JP para 4 → EN paras 7,8)
  // JP: 7 sentences, EN: 7 sentences. Perfect 1:1.
  // =========================================================================
  [
    "今年わたしは八十三歳です。",
    "This year, I am 83 years old.",
  ],
  [
    "剣道人生も六十三年になりました。",
    "It has now been 63 years since I began my Kendo journey.",
  ],
  [
    "わたしが館長を務める松戸の松風館や尚美学園大学で今も変わらず稽古を続けています。",
    "I continue to train regularly at Shofukan in Matsudo, where I serve as the head instructor, as well as at Shobi University.",
  ],
  [
    "コロナ禍で対人稽古が中止になった期間もあり、体力の落ち込みを感じています。",
    "There was a time during the COVID-19 pandemic when interpersonal Keiko had to be suspended, and since then, I have felt a noticeable decline in physical strength.",
  ],
  [
    "以前ならば届いていた面が今は届かない。",
    "Men strikes that used to reach their target no longer do.",
  ],
  [
    "一時間ほどの稽古をすると、筋肉が攣ってしまうようなことも度々あります。",
    "Sometimes, after about an hour of practice, my muscles cramp up.",
  ],
  [
    "それでも健康面では薬要らずの生活を送れていますので助かっています。",
    "Even so, I'm grateful that I've been able to live without relying on medication.",
  ],

  // =========================================================================
  // HEALTH 2 (JP para 5 → EN para 9)
  // JP: 4 sentences. EN: 5 sentences.
  // JP1 combines EN1+EN2 (chronic conditions + digestive medicine are one JP sentence)
  // =========================================================================
  [
    "健康に関しては、高血圧や高血糖を始めとする成人病にも罹らず、いわゆる持病を持っていませんので、薬といったらたまに胃腸薬を飲むくらいです。",
    "In terms of health, I haven't developed any chronic conditions such as high blood pressure or high blood sugar, and I have no so-called underlying illnesses. The only medicine I take on occasion is for digestive issues.",
  ],
  [
    "目に関しては白内障の手術をしましたが、メガネも要らない日常を送れています。",
    "I did have cataract surgery on my eyes, but I live my daily life without needing glasses.",
  ],
  [
    "一方で長年剣道をやられている方に多い、難聴には悩まされています。",
    "On the other hand, I do suffer from hearing loss, a condition common among those who have practiced Kendo for many years.",
  ],
  [
    "日常生活に補聴器が欠かせません。",
    "Hearing aids have become indispensable in my daily life.",
  ],

  // =========================================================================
  // INJURIES (JP para 6) — ENTIRELY MISSING from English
  // JP: 9 sentences. All null.
  // =========================================================================
  ["怪我に関しては、剣道によるものを何度かしました。", null],
  ["右膝や肘の手術、腕の二頭筋を切ったこともあります。", null],
  ["一番辛かったのは肩のインナーマッスルである左肩の腱板の損傷で、手術のため五日間入院をしました。", null],
  ["七十代の頃だったのですが、稽古中、面に打突した際痛みを覚えました。", null],
  ["しかしそのまま最後までやり通し、その後医者に行きました。", null],
  ["完全に腱板が切れていると診断され、不安を覚えました。", null],
  ["とくに歳を重ねてからの怪我は剣道生命に関わることが多いからです。", null],
  ["しかし幸いにも整形外科の名医に出会うことができ、五日間の入院、内視鏡手術で繋いでいただきました。", null],
  ["その後半年間稽古をやりませんでしたが、ほとんど問題なく復活することができました。", null],

  // =========================================================================
  // REASONABLE LIFESTYLE (JP para 7 → EN para 10)
  // JP: 4 sentences, EN: 4 sentences. 1:1.
  // =========================================================================
  [
    "このように健康で八十三歳まで生きて来られたのは、剣道と「いい加減」な生活のおかげと思っています。",
    'I believe that I\'ve been able to live in good health up to the age of 83 thanks to Kendo—and also to what I call a "reasonable" or "easy going" lifestyle.',
  ],
  [
    "生きていれば嫌な思いを抱くことは当然あります。",
    "Naturally, as long as we are alive, there will be times when we face unpleasant situations.",
  ],
  [
    "しかし意識はしていても、よい加減で対処していますと、自然に終わってしまいます。",
    "But even when such things happen, if you deal with them in a balanced and relaxed way, they tend to resolve on their own over time.",
  ],
  [
    "ストレスを溜めないことは大事です。",
    "It's important not to accumulate stress.",
  ],

  // =========================================================================
  // PARENTS / FAMILY (JP para 8) — ENTIRELY MISSING from English
  // JP: 5 sentences. All null.
  // =========================================================================
  ["またわたしは親からいただいたありがたい体のおかげで、健康を維持できていると思います。", null],
  ["実家は農家だったのですが、戦中戦後の貧しい時期、粗食で育ったのが良かったのかも知れません。", null],
  ["長男は怪我で施設に入っていますが、次男はまだ現役で働いていますし、私は剣道、妹は農業をやっています。", null],
  ["みなが健康で活躍できて、幸せを感じています。", null],

  // Wait — there are 5 JP sentences in this paragraph:
  // またわたしは親からいただいたありがたい体のおかげで、健康を維持できていると思います。
  // 実家は農家だったのですが、戦中戦後の貧しい時期、粗食で育ったのが良かったのかも知れません。
  // 長男は怪我で施設に入っていますが、次男はまだ現役で働いていますし、私は剣道、妹は農業をやっています。
  // みなが健康で活躍できて、幸せを感じています。
  // That's 4 sentences. Let me recount — actually the JP text:
  // "またわたしは親からいただいたありがたい体のおかげで、健康を維持できていると思います。実家は農家だったのですが、戦中戦後の貧しい時期、粗食で育ったのが良かったのかも知れません。長男は怪我で施設に入っていますが、次男はまだ現役で働いていますし、私は剣道、妹は農業をやっています。みなが健康で活躍できて、幸せを感じています。"
  // Yes, 4 sentences on 。splits.

  // =========================================================================
  // SECTION HEADING: 自らの剣道を年代別に考える → EN para 11
  // =========================================================================
  ["自らの剣道を年代別に考える", "Reflecting on My Kendo Through the Stages of Life"],

  // =========================================================================
  // POLICE COLLEAGUES BRIDGE (JP para 10) — ENTIRELY MISSING from English
  // JP: 7 sentences. The EN jumps from health directly to Mochida quote.
  // =========================================================================
  ["今回は生涯剣道がテーマです。", null],
  ["そのためにはここまで述べたようにまずは健康が第一です。", null],
  ["わたしは警察に奉職しましたが、同期生は六十人いました。", null],
  ["この歳になると、その半分以上が他界しています。", null],
  ["同期会を五年くらい前まで開催していたのですが、みなやっと動いているような状態で、笑い話のようですが、飲み放題プランを注文してもみなお酒をほとんど飲めず結局、損をしたというような状態です。", null],
  ["そして会自体も消滅しました。", null],
  ["わたしは剣道を続けているおかげで一番元気です。", null],

  // =========================================================================
  // MOCHIDA QUOTE + OWN REFLECTION (JP para 11 → EN paras 12-17)
  // This is the LONGEST section. One JP paragraph spans 6 EN paragraphs.
  //
  // JP para 11 contains:
  //   - Lead-in: "生涯剣道を年代別に考える際、持田盛二先生（範士十段）の" (...opens quote)
  //   - Mochida quote: 13 sentences within 「」
  //   - Post-quote: "という言葉はまさに至言です。"
  //   - Own reflection: 20s-40s training, 8th dan (4 sentences)
  //
  // EN paras 12-17:
  //   - P12: Mochida intro lead-in
  //   - P13: Mochida 50s-60s (5 sentences)
  //   - P14: Mochida 70s (4 sentences)
  //   - P15: Mochida 80s (3 sentences)
  //   - P16: "These words are... profound truth"
  //   - P17: Own reflection (4 sentences: 20s-40s kakaru-keiko, strong points, essential through 40s, 8th dan at 49)
  //
  // Sentence-level mapping:
  // =========================================================================

  // -- Lead-in + Mochida Q1 --
  [
    "生涯剣道を年代別に考える際、持田盛二先生（範士十段）の「わたしは剣道の基礎を体で覚えるのに五十年かかった。",
    'When thinking about lifelong Kendo by stages of age, these words of Mochida Moriji (Hanshi 10th Dan) resonate deeply: "It took me fifty years to truly internalize the fundamentals of Kendo.',
  ],

  // -- Mochida Q2+Q3 (JP 2 sentences → EN 1 sentence) --
  [
    "わたしの剣道は五十を過ぎてから本当の修行に入った。心で剣道しようとしたからである。",
    "My real training began after I turned fifty—when I began practicing Kendo with the heart.",
  ],

  // -- Mochida Q4 —
  [
    "六十歳になると足腰が弱くなる。",
    "At sixty, my legs and hips began to weaken.",
  ],
  // -- Mochida Q5 —
  [
    "この弱さを補うのは心である。",
    "To compensate for that weakness, I relied on the heart.",
  ],
  // -- Mochida Q6 —
  [
    "心を動かして弱点を強くするように努めた。",
    "I trained to strengthen my weaknesses by moving the heart.",
  ],

  // -- Mochida Q7 —
  [
    "七十歳になると身体全体が弱くなる。",
    "At seventy, my entire body began to weaken.",
  ],
  // -- Mochida Q8 —
  [
    "こんどは心を動かさない修行をした。",
    "So I trained to keep the heart still.",
  ],
  // -- Mochida Q9 —
  [
    "心が動かなくなれば、相手の心がこちらの鏡に映ってくる。",
    "When the heart becomes still, the opponent's heart is reflected in it like a mirror.",
  ],
  // -- Mochida Q10 —
  [
    "心を静かに、動かさないように努めた。",
    "I strove to keep my heart calm and unmoved.",
  ],

  // -- Mochida Q11 —
  [
    "八十歳になると心は動かなくなった。",
    "At eighty, my heart no longer moves.",
  ],
  // -- Mochida Q12 —
  [
    "だが時々雑念が入る。",
    "But now and then, stray thoughts enter.",
  ],
  // -- Mochida Q13 (closing quote) —
  [
    "心の中に雑念を入れないように修行をしている」",
    'I am now training to prevent those distractions from arising within my heart."',
  ],

  // -- Post-quote —
  [
    "という言葉はまさに至言です。",
    "These words are, without a doubt, a profound truth.",
  ],

  // -- Own reflection 1 —
  [
    "わたし自身の剣道を振り返りますと、二十代から四十代くらいまでは完全に掛かる稽古をしていました。",
    "Looking back on my own Kendo, from my twenties to around my forties, my practice was entirely focused on Kakaru-keiko—the act of a lower-ranked practitioner earnestly and continuously attacking a senior in order to improve.",
  ],
  // -- Own reflection 2 —
  [
    "相手の弱点を打つのではなく、元立の先生の強いところ、強いところへと掛かっていきます。",
    "Rather than aiming for my opponent's weak points, I would deliberately challenge the strong points of the Motodachi, again and again.",
  ],
  // -- Own reflection 3 —
  [
    "そうした、いわゆる先の稽古が四十代までは必要だと思っています。",
    "I believe that this kind of forward-leaning, committed training is essential through one's forties.",
  ],
  // -- Own reflection 4 (8th dan) —
  [
    "そしてわたしは四十九歳で八段に合格しました。",
    "And then, I passed the 8th Dan exam at the age of 49.",
  ],

  // =========================================================================
  // 50s/60s (JP para 12 → EN para 18)
  // JP: 3 sentences. EN: 3 sentences.
  // =========================================================================
  [
    "五十代、六十代というのは剣道家にとって一番強い時期だと感じています。",
    "I believe that one's fifties and sixties are the strongest years in a Kendo practitioner's life.",
  ],
  [
    "その時代に自分の剣道をどういう方向に持っていくのかを考えます。",
    "It is during this period that we must consider what direction to take our Kendo.",
  ],
  [
    "わたしは気を持って攻める剣道を志しました。",
    "For me, I aspired to pursue a style of Kendo that attacks with Ki.",
  ],

  // =========================================================================
  // CAUTION (JP para 13 → EN para 19)
  // JP: 5 sentences. EN: 5 sentences.
  // =========================================================================
  [
    "この年代で注意すべきことですが、強さと経験があるあまり元立ちをする際に相手と稽古をしてもすぐに中断し、講釈を加える先生がいます。",
    "There is something I believe we must be careful about at this stage. Some senior practitioners, due to their strength and experience, tend to stop Keiko partway through when acting as Motodachi and begin giving explanations or lectures.",
  ],
  [
    "あれはやるべきではないと思っています。",
    "I believe this is something that should not be done.",
  ],
  [
    "それでは、掛かり手の気を完全にくじいてしまいます。",
    "Doing so completely crushes the spirit of the Kakari-te, the one who is earnestly trying to challenge and learn.",
  ],
  [
    "一生懸命に挑戦しようという意識で掛かってきていますので、それは絶対やるべきではありません。",
    "They are coming forward with a sincere will to improve, so interrupting their effort is absolutely the wrong approach.",
  ],
  [
    "稽古が終わってから伝えてやればいいのです。",
    "If there is something to be taught, it should be conveyed after the Keiko is over.",
  ],

  // =========================================================================
  // 70s (JP para 14 → EN para 20)
  // JP: 4 sentences. EN: 4 sentences.
  // =========================================================================
  [
    "続いて七十代については、その人が持った強さが物を言います。",
    "As for one's seventies, it is a stage where the strength a person has cultivated over the years truly shows.",
  ],
  [
    "確かに身体は弱ってきます。",
    "It's true that the body begins to decline.",
  ],
  [
    "そうなると相手を引き出して、指導できる稽古も必要になります。",
    "At this point, it becomes important to guide others through a kind of Keiko that draws the opponent out rather than overpowering them.",
  ],
  [
    "七十代では無理やりの稽古をしないことが大切です。身体を壊しては元も子もなくなります。",
    "In your seventies, it is crucial not to engage in overly forceful or reckless training. If you injure your body, you lose everything.",
  ],

  // =========================================================================
  // 80s NOW (JP para 15 → EN para 21)
  // JP: 2 sentences. EN: 2 sentences.
  // =========================================================================
  [
    "八十代になった今は試行錯誤をしています。",
    "Now that I am in my eighties, I find myself constantly exploring and adjusting.",
  ],
  [
    "体力の低下は如何ともしがたく、それをどうするのかが、生涯剣道の課題だと思っています。",
    "The decline in physical strength is something that simply cannot be avoided, and how to deal with that is, I believe, the central challenge of lifelong Kendo.",
  ],

  // =========================================================================
  // ALL STAGES (JP para 16 → EN para 22)
  // JP: 4 sentences. EN: 4 sentences.
  // =========================================================================
  [
    "あらゆる年代で大切なことは、自分の剣道をどうしていくかということです。",
    "What's important at every stage of life is to consider how you will develop your own Kendo.",
  ],
  [
    "勉強をしながら進めていくのが必要です。",
    "It must be a continuous process of study and refinement.",
  ],
  [
    "ですから持田先生が八十歳になったら「雑念が入る」とおっしゃいましたが、わたしは雑念だらけです。",
    'Mochida Sensei once said that by the time he reached eighty, "stray thoughts would occasionally enter his mind." In my case, I feel like my mind is full of stray thoughts.',
  ],
  [
    "ゆえにこれからもさらに勉強をしていきます。",
    "That is precisely why I will continue to study and learn from here on as well.",
  ],

  // =========================================================================
  // SPECIFIC PRACTICES / JOGGING (JP para 17 → EN paras 23,24,25)
  // JP: 9 sentences across one long paragraph.
  // EN: 3 paragraphs with multiple sentences.
  // =========================================================================

  // JP1: intro + young years + started jogging at 40
  [
    "わたしが悩み実践していたことを具体的に述べていきましょう。若い頃のやり方としては基礎的な身体や体力をつくることに努めました。四十歳からはジョギングを始めました。",
    "Let me share some of the specific things I struggled with and put into practice. In my younger years, I focused on building a solid physical foundation and improving my overall strength. From the age of forty, I began jogging.",
  ],
  // JP2: ran until retirement at 60
  [
    "定年となる六十歳まで暇があれば走りました。",
    "Until I retired at sixty, I would go running whenever I had the time.",
  ],

  // JP3: running with variable pace vs marathon
  [
    "走り方のコツとしては、緩急をつけることです。マラソン選手は一定の距離を一定のスピードで走ることが良しとされます。",
    "One key to running effectively is to vary the pace. Marathon runners are often trained to maintain a consistent speed over long distances, but Kendo requires explosive power.",
  ],
  // JP4: sprints and walking variation + fumikomi dashing
  [
    "しかし剣道は瞬発力が必要ですから、走っている途中にダッシュを入れたり、歩いたりと緩急をつけしました。踏み込み足のダッシュもやりましたが、それらが大きなプラスになりました。",
    "So during my runs, I would alternate between sprints and walking to introduce variation in intensity. I also practiced dashing with Fumikomi-ashi, which proved to be extremely beneficial.",
  ],
  // JP5: sprint training for younger students
  [
    "ダッシュはもっと若い中高生でも将来につながる練習法で、身体づくりになると思います。",
    "I believe sprint training is valuable even for younger practitioners, such as junior and high school students, as it helps build the body for future Kendo performance.",
  ],

  // JP6: thinking about kendo while running + taking notes
  [
    "わたしは走りながら、剣道のことを考えていました。そして何か気づきがあった場合は、走り終えたのちに、メモにして自らの参考にしました。",
    "While running, I would often think about Kendo. And whenever a realization came to me, I would make a note of it after the run and refer back to it later for my own development.",
  ],

  // =========================================================================
  // SHORT WRAP (JP para 18 → EN paras 26,27)
  // JP: 3 sentences. EN: 2 paragraphs.
  // =========================================================================
  [
    "その体力をもって掛かる稽古をし、元立ちに立てば気攻め、体の攻めでの剣道を志しました。",
    "With the physical strength I had built, I engaged in Kakaru-keiko, and when serving as Motodachi, I aimed to practice Kendo through Ki-zeme (spiritual pressure) and physical pressure.",
  ],
  [
    "五十代、六十代は強いですから、その強さを出してもいい年代です。",
    "One is strong during their fifties and sixties, and it is a time when it's appropriate to fully express that strength.",
  ],
  [
    "そして七十代に至っては相手の心をつかんで、引き出す稽古をすればいいのです。",
    "By the time one reaches their seventies, the focus should shift to grasping the opponent's intent and drawing it out through Keiko.",
  ],

  // =========================================================================
  // SECTION HEADING: 八十代となり今感じること → EN para 28
  // =========================================================================
  ["八十代となり今感じること", "Eighties: Searching for Balance in Decline"],

  // =========================================================================
  // 80s FEELS 1 (JP para 20 → EN para 29)
  // JP: 4 sentences. EN: 4 sentences (in 1 paragraph).
  // =========================================================================
  [
    "そして数年前に八十代となりました。",
    "A few years ago, I entered my eighties.",
  ],
  [
    "ある程度歳をとったら、自分の体を見直しながら稽古をやる必要があるのを感じています。",
    "At a certain age, it becomes necessary to reflect on your physical condition and adjust your approach to Keiko accordingly.",
  ],
  [
    "この松風館で日常的に稽古をしていますが、一時間元立ちをしていると無理を感じる時があります。",
    "I continue to practice regularly here at Shofukan, but there are times when, after an hour of serving as Motodachi, I begin to feel that I'm pushing myself too far.",
  ],
  [
    "そうなると相手に対しても無理無駄な稽古になってきます。",
    "When that happens, the training can become inefficient or even counterproductive for both myself and my partner.",
  ],

  // =========================================================================
  // KEIko dragging on (JP para 20 continues → EN para 30)
  // JP: 2 more sentences from the same JP paragraph match EN para 30
  // Actually let me re-examine:
  // JP para 20 full text:
  // "そして数年前に八十代となりました。ある程度歳をとったら、自分の体を見直しながら稽古をやる必要があるのを感じています。この松風館で日常的に稽古をしていますが、一時間元立ちをしていると無理を感じる時があります。そうなると相手に対しても無理無駄な稽古になってきます。グズグズと長い稽古をしていると、「面に来なさい、はい、返し胴で」と応じるばかりの技が多くなりがちです。それでは掛かり手によくありません。"
  // That's 6 sentences in JP para 20.
  // EN para 29: "A few years ago... counterproductive for both myself and my partner." (4 sentences)
  // EN para 30: "If Keiko drags on... not beneficial for the Kakari-te." (2 sentences)
  // =========================================================================
  [
    "グズグズと長い稽古をしていると、「面に来なさい、はい、返し胴で」と応じるばかりの技が多くなりがちです。",
    'If Keiko drags on for too long, it tends to fall into a routine pattern—such as simply saying, "Come in for Men," followed by a predictable response like "okay, Kaeshi-do."',
  ],
  [
    "それでは掛かり手によくありません。",
    "This kind of interaction is not beneficial for the Kakari-te.",
  ],

  // =========================================================================
  // 80s FEELS 2 (JP para 21 → EN para 31)
  // JP: 3 sentences. EN: 3 sentences.
  // =========================================================================
  [
    "今は体調・調子を整えるような心構えで道場に赴き、無理な稽古をしないことを心掛けています。",
    "These days, I go to the Dojo with the mindset of maintaining my physical condition, and I make a conscious effort not to overdo it.",
  ],
  [
    "相手との稽古時間を短くすると、いい稽古ができると思うようになりました。",
    "I've come to believe that shorter training times can actually lead to better quality practice.",
  ],
  [
    "短い時間で集中してやるのが大切だと思っています。",
    "What matters is focusing and giving your all within that limited time.",
  ],

  // =========================================================================
  // FIRST STRIKE (JP para 22 → EN para 32)
  // JP: 5 sentences. EN: 5 sentences.
  // =========================================================================
  [
    "また稽古内容では、改めて自分の初太刀の大切さを認識しています。",
    "In terms of Keiko content, I have come to recognize once again the importance of the first strike.",
  ],
  [
    "蹲踞から立ち上がり気を出し攻めると、掛かり手は必ず面に来ます。",
    "When rising from Sonkyo and projecting Ki to pressure the opponent, the Kakari-te will inevitably come in for Men.",
  ],
  [
    "それが分かっているので、先ほども述べたように返し胴で捉えるというのは、自分では何か嫌な感じがするものです。",
    "Knowing that, responding with a Kaeshi-do strike, as I mentioned earlier, often leaves me with a sense of discomfort.",
  ],
  [
    "引き出してはいるのですが、待っているような感じがするのでしょうか。",
    "While I am drawing the opponent out, it somehow feels as if I am simply waiting.",
  ],
  [
    "合気になって先の技をかける意識を持ってやらないといけないと、今でも反省をもって考えています。",
    "That's why I believe I must always act with the intention of striking first in Aiki—with true timing and connection—and I continue to reflect on this even now.",
  ],

  // =========================================================================
  // DAILY SCHEDULE (JP para 23 → EN para 33)
  // JP: 2 sentences. EN: 2 sentences.
  // =========================================================================
  [
    "また無理な稽古をしないのと重複するようですが、一日の生活をどういうスケジュールやリズムを持って送るかにも気を使っています。",
    "This may overlap with what I said earlier about avoiding overexertion, but I also pay close attention to how I structure and pace my daily life.",
  ],
  [
    "うまく整えることが、稽古にも大きなプラスになると思っています。",
    "Maintaining a good rhythm and schedule contributes significantly to the quality of my Keiko.",
  ],

  // =========================================================================
  // EXERCISE REGIMEN (JP para 24 → EN paras 34,35,36)
  // JP: 10 sentences. EN: 3 paragraphs.
  // =========================================================================
  [
    "そうして整えたスケジュールの中で、今日は稽古がなければ、少し長く歩くとか、軽く走るというのもいいでしょう。",
    "Within this well-balanced daily schedule, if there's no Keiko on a given day, it can be beneficial to go for a longer walk or do some light jogging.",
  ],
  [
    "無理に走ると膝を壊して、剣道の役に立たなくなりますので要注意です。",
    "However, it's important to be careful—pushing yourself too hard can damage your knees, which would ultimately hinder your Kendo.",
  ],
  [
    "剣道をやる方の中で膝を壊す人が多いです。",
    "Many Kendo practitioners suffer knee injuries,",
  ],
  [
    "膝を壊すとまともな剣道ができなくなりますので、無理なジョギング、走り方をしないのはポイントになると思っています。",
    "and once the knees are damaged, it becomes difficult to practice proper Kendo. So avoiding overly strenuous jogging or improper running form is, in my opinion, a key point.",
  ],
  [
    "私も右膝を壊しました。",
    "I myself injured my right knee.",
  ],
  [
    "リハビリでは朝起きてベッドに座り、足上げを毎日五十回やりました。",
    "As part of my rehabilitation, I began each morning by sitting on the edge of my bed and doing 50 leg raises every day.",
  ],
  [
    "わたしにとっては効果覿面で、膝の痛みがなくなりましたので、今も生活パターンの中に入っています。",
    "This was incredibly effective for me and this routine remains a part of my daily life.",
  ],
  [
    "並行して稽古後の体のケアも大切となります。",
    "In parallel with that, post-Keiko body care is also essential.",
  ],
  [
    "毎日稽古をやる方もいますし、何日か空ける方もいます。",
    "Some people train every day, while others take breaks between sessions.",
  ],
  [
    "わたしは稽古が終わって、正座をすると足が攣ってしまいます。ですからなるべく水分を摂ったり、身体を伸ばす、漢方薬を飲むなどして対処しています。",
    "After Keiko, when I sit in Seiza, my legs often cramp. So I make a conscious effort to stay hydrated, stretch my body, and take herbal medicine to manage it.",
  ],

  // =========================================================================
  // SHINAI ADJUSTMENT (JP para 25 → EN paras 37,38)
  // JP: 6 sentences. EN: 2 paragraphs.
  // =========================================================================
  [
    "一方で身体の衰えに合わせた、竹刀の重さや長さを調整するのも大事でしょう。",
    "On the other hand, adjusting the weight and length of the Shinai to match the natural decline in physical ability is also important.",
  ],
  [
    "一般の成人男性の竹刀は510ｇ以上ですが、普段の稽古ではその重さを規定通りに考える必要はないと思っています。",
    "While the standard weight for an adult Male's Shinai is 510 grams or more, I don't believe it's necessary to strictly follow those regulations during regular Keiko.",
  ],
  [
    "私はいま軽くしています。竹は太めにして、460～470ｇぐらいでしょうか。柄などをつけても500ｇ前後です。",
    "I now use a lighter shinai. The bamboo is slightly thicker, and the total weight is around 460 to 470 grams—about 500 grams with the handle and fittings.",
  ],
  [
    "ですが、それが一番丁度いいです。",
    "For me, that feels just right.",
  ],
  [
    "手の握力がかなり落ちていますので、柄の太さも自分の握力の状態によって、変えています。",
    "My grip strength has declined significantly, so I also adjust the thickness of the Tsuka to match the current state of my hands.",
  ],
  [
    "一般的には握り部分の細い竹刀が使えなくなってきます。用具の調整も心掛ける点でしょう。",
    "In general, thinner handles become more difficult to use over time. I believe proper adjustment of equipment is another important point for continuing Kendo as we age.",
  ],

  // =========================================================================
  // SECTION HEADING: 相手や自分のプラスを考える → EN para 39
  // =========================================================================
  ["相手や自分のプラスを考える", "Training for Mutual Benefit"],

  // =========================================================================
  // MUTUAL BENEFIT / TAKASAKI (JP para 27 → EN paras 40,41,42)
  // JP: 5 sentences. EN: 3 paragraphs.
  // =========================================================================
  [
    "歳を重ねてからの稽古では、最終的に「打ったとか打たれた」ではなく、何かそこに自分にプラスになるようなことや、相手に対しての配慮を持つことが大事です。",
    "In training at an advanced age, what ultimately matters is not whether you struck or were struck, but whether something positive was gained, either for yourself or for your training partner. It's important to approach keiko with that sense of consideration and purpose.",
  ],
  [
    "コロナ禍になる以前のお話ですが、今年九十九歳になった高﨑慶男範士は一生懸命にまっすぐに構え、掛かり手に面打ちをさせていました。気に入らなければ何本でも打たせます。相手のいい打突が出たところで「よし」と稽古を終わらせていました。",
    "Before the COVID-19 pandemic, I had the opportunity to witness Takasaki Yoshio Sensei, who turned 99 this year, stand in Kamae with great sincerity and composure, inviting Men strikes from his partners. If he wasn't satisfied with a strike, he would let them try again however many times it took. When a truly good strike came, he would simply say, \"Good,\" and end the keiko.",
  ],
  [
    "先生のその姿に感心を覚えたものです。",
    "I was deeply impressed by his demeanor.",
  ],
  [
    "十本のうち一本でもいいから相手の最良の技を引き出す。",
    "Even if just one out of ten strikes is a good one, to be able to draw out someone's best technique",
  ],
  [
    "自らの気を養いながら、「打った、打たれた」を乗り越えて、相手のための剣道をする好例だと思います。",
    'while nurturing one\'s own spirit. This is a prime example of Kendo that goes beyond "striking or being struck" and becomes Kendo for the sake of the other person.',
  ],

  // =========================================================================
  // NIHON KENDO KATA (JP para 28) — ENTIRELY MISSING from English
  // JP: 11 sentences. EN skips kata anecdotes entirely, goes to Morishima seminar.
  // =========================================================================
  ["日本剣道形の演武をする機会はいくつになってもあると思います。", null],
  ["相手の先生と合わせるのはもちろん、それを第三者に観てもらい、教えを請う姿勢が大事です。", null],
  ["わたしが全日本選手権で島野大洋範士と演武した際には、その前に大阪に赴き、園田政治範士に立ち会っていただきました。", null],
  ["さらに関東に戻ってきた際には、園田範士そして岡憲次郎範士に立ち会いをお願いしました。", null],
  ["そして教えをいただき、本番に臨みました。", null],
  ["京都の演武大会で剣道形を打った際は、相手が広島の熊本正範士でした。", null],
  ["その際も広島まで出向き、広島の刑務所で熊本先生の教えを受けながら、気を合わせて剣道形を行い帰ってきました。", null],
  ["演武大会の当日形が終わったあと、ご覧になっていた森島健男範士のところへ、「教えていただきたいです」と行きました。", null],
  ["しかし一度目は何もおっしゃいません。", null],
  ["そこで二度行きました。", null],
  ["そうしたら「小太刀一本目、受け流しの手が上まで上がっていなかった。あとは概ねいい」と教えていただきました。", null],

  // =========================================================================
  // MORISHIMA (JP para 29 → EN para 43)
  // JP: 3 sentences. EN: 3 sentences.
  // =========================================================================
  [
    "森島先生には剣道講習会の講師を務めた際も、お世話になりました。",
    "I was also fortunate to receive guidance from Morishima Tateo Sensei when I served as an instructor at a Kendo seminar.",
  ],
  [
    "主任講師であられた森島先生に、自前の資料を事前につくり、内容のお伺いを立てました。",
    "As he was the chief instructor, I prepared my own teaching materials in advance and submitted them to him for review.",
  ],
  [
    "先生に手直しや意見もいただきながら当日を迎えることができました。",
    "Thanks to his feedback and suggestions, I was able to approach the seminar day with confidence and clarity.",
  ],

  // =========================================================================
  // CONCLUSION 1 (JP para 30 → EN para 44)
  // JP: 2 sentences. EN: 2 sentences.
  // =========================================================================
  [
    "このように歳をとっても、一生涯教わるという意識を持つことが必要です。",
    "Even as we grow older, it is essential to maintain the mindset of being a lifelong learner.",
  ],
  [
    "そうした中で自分の剣道の修整・修行ができるのではと思っています。",
    "I believe that it is within this ongoing process of learning that we are able to refine and deepen our own Kendo.",
  ],

  // =========================================================================
  // CONCLUSION 2 (JP para 31 → EN para 45)
  // JP: 4 sentences. EN: 4 sentences.
  // =========================================================================
  [
    "剣道は一生を通じて行うものです。",
    "Kendo is something to be practiced throughout one's life.",
  ],
  [
    "ですから年代ごとに考え、今の自分の体力などを鑑みて、やっていくのが大切となります。",
    "That is why it's important to approach it with awareness of each stage of life, adjusting to your current physical condition and capacity.",
  ],
  [
    "わたしは剣道を始めて六十三年になります。",
    "I have now been practicing Kendo for 63 years.",
  ],
  [
    "なによりも健康第一、そして「教える」「教わる」の考えのもとに稽古を行っており、剣道を通じた幸せを日々噛み締めております。",
    "Above all, I prioritize good health, and I train with the spirit of both teaching and being taught. Each day, I feel a deep sense of gratitude for the happiness that Kendo brings into my life.",
  ],
];

// ===========================================================================
// Validation
// ===========================================================================

function validatePairs(pairs: Array<[string, string | null]>) {
  const issues: string[] = [];
  let nullCount = 0;

  for (let i = 0; i < pairs.length; i++) {
    const [jp, en] = pairs[i];
    if (!jp || jp.trim().length === 0) {
      issues.push(`[${i}] Empty JP text`);
    }
    if (en === null) {
      nullCount++;
    } else if (en.trim().length === 0) {
      issues.push(`[${i}] Empty EN text (should be null)`);
    }
  }

  console.log(`\n=== VALIDATION ===`);
  console.log(`Total pairs: ${pairs.length}`);
  console.log(`Null EN count: ${nullCount} (${((nullCount / pairs.length) * 100).toFixed(1)}%)`);
  if (issues.length > 0) {
    console.log(`Issues:`);
    for (const issue of issues) console.log(`  - ${issue}`);
  } else {
    console.log(`No structural issues found.`);
  }
  return { nullCount, total: pairs.length };
}

// ===========================================================================
// Database operations
// ===========================================================================

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Validate first
  const stats = validatePairs(PAIRS);

  if (dryRun) {
    console.log(`\n=== DRY RUN — First 5 pairs ===`);
    for (let i = 0; i < Math.min(5, PAIRS.length); i++) {
      const [jp, en] = PAIRS[i];
      console.log(`[${i}] JP: ${jp.slice(0, 120)}${jp.length > 120 ? "…" : ""}`);
      console.log(`     EN: ${(en ?? "(null)").slice(0, 120)}${(en ?? "").length > 120 ? "…" : ""}`);
    }

    // Show Mochida quote block (approximately pairs 58-77)
    console.log(`\n=== Mochida quote block (pairs 57-76) ===`);
    for (let i = 57; i <= 76 && i < PAIRS.length; i++) {
      const [jp, en] = PAIRS[i];
      console.log(`[${i}] JP: ${jp.slice(0, 100)}${jp.length > 100 ? "…" : ""}`);
      console.log(`     EN: ${(en ?? "(null)").slice(0, 100)}${(en ?? "").length > 100 ? "…" : ""}`);
    }

    // Show intro + bio (first 20 pairs)
    console.log(`\n=== Intro + Bio block (pairs 0-15) ===`);
    for (let i = 0; i <= 15 && i < PAIRS.length; i++) {
      const [jp, en] = PAIRS[i];
      console.log(`[${i}] JP: ${jp.slice(0, 80)}${jp.length > 80 ? "…" : ""}`);
      console.log(`     EN: ${(en ?? "(null)").slice(0, 80)}${(en ?? "").length > 80 ? "…" : ""}`);
    }

    console.log(`\nDone (dry-run).`);
    return;
  }

  // --- Load env & connect ---
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("FATAL: Missing Supabase credentials in .env.local");
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ARTICLE_ID = "c6a1c342-0385-46e2-afd3-97fb3c5c82e6";
  const N = PAIRS.length;
  const now = new Date().toISOString();

  // 1. DELETE old segments
  console.log(`Deleting old segments for ${ARTICLE_ID}...`);
  const { error: delErr } = await sb.from("segments").delete().eq("article_id", ARTICLE_ID);
  if (delErr) {
    console.error("DELETE failed:", delErr.message);
    process.exit(1);
  }
  console.log(`  Deleted.`);

  // 2. INSERT new segments
  console.log(`Inserting ${N} new segments...`);
  const inputs = PAIRS.map(([jp, en], i) => ({
    article_id: ARTICLE_ID,
    position: i,
    source_text: jp,
    target_text: en,
    status: "qa_approved",
    source_lang: "ja",
    target_lang: "en",
    metadata: {
      manual_alignment: true,
      batch: "iwatate_redo",
      aligned_at: now,
      para_index: -1, // manual alignment doesn't track paragraph index
      sent_index: i,
    },
  }));

  const BATCH_SIZE = 100;
  for (let off = 0; off < N; off += BATCH_SIZE) {
    const batch = inputs.slice(off, off + BATCH_SIZE);
    const { error: segErr } = await sb.from("segments").insert(batch);
    if (segErr) {
      console.error(`INSERT failed at offset ${off}:`, segErr.message);
      process.exit(1);
    }
    console.log(`  Inserted ${off + batch.length}/${N}`);
  }

  // 3. UPDATE articles
  console.log(`Updating articles...`);
  const { error: artErr } = await sb
    .from("articles")
    .update({ segment_count: N, segmented: true, translation_status: "qa_approved" })
    .eq("id", ARTICLE_ID);
  if (artErr) {
    console.error("UPDATE articles failed:", artErr.message);
    process.exit(1);
  }

  // Verify tags: ensure needs_manual_review is NOT present
  const { data: artData } = await sb
    .from("articles")
    .select("tags")
    .eq("id", ARTICLE_ID)
    .single();
  const tags: string[] = artData?.tags ?? [];
  if (tags.includes("needs_manual_review")) {
    const newTags = tags.filter((t) => t !== "needs_manual_review");
    await sb
      .from("articles")
      .update({ tags: newTags.length > 0 ? newTags : null })
      .eq("id", ARTICLE_ID);
    console.log(`  Removed needs_manual_review tag.`);
  } else {
    console.log(`  No needs_manual_review tag (already clean).`);
  }

  // 4. UPSERT document_settings
  console.log(`Upserting document_settings...`);
  const translatedCount = inputs.filter((s) => s.target_text !== null).length;
  const boundaries = Array.from({ length: N }, (_, i) => i);
  const { error: dsErr } = await sb
    .from("document_settings")
    .upsert(
      {
        article_id: ARTICLE_ID,
        source_lang: "ja",
        target_lang: "en",
        paragraph_boundaries: boundaries,
        total_segments: N,
        translated_count: translatedCount,
        reviewed_count: translatedCount,
        approved_count: translatedCount,
        assigned_translators: [],
      },
      { onConflict: "article_id" },
    );
  if (dsErr) {
    console.error("UPSERT document_settings failed:", dsErr.message);
    process.exit(1);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Article: ${ARTICLE_ID}`);
  console.log(`Segments: ${N}`);
  console.log(`Null EN: ${stats.nullCount} (${((stats.nullCount / N) * 100).toFixed(1)}%)`);
  console.log(`Translated count: ${translatedCount}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
