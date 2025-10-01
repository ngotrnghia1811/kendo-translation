'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UserProfile {
    role: 'admin' | 'translator' | 'reader' | null;
}

interface NavItem {
    href: string;
    label: string;
    shortLabel?: string;
    roles: ('admin' | 'translator' | 'reader')[];
}

const navItems: NavItem[] = [
    { href: '/documents', label: 'Documents', roles: ['admin', 'translator', 'reader'] },
    { href: '/terminology', label: 'Terminology', shortLabel: 'Terms', roles: ['admin', 'translator', 'reader'] },
    { href: '/admin', label: 'Admin', roles: ['admin'] },
];

export function RoleBasedNavigation() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.profile || { role: null });
                } else {
                    setProfile({ role: null });
                }
            } catch {
                setProfile({ role: null });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const visibleItems = navItems.filter(item => {
        if (!profile || !profile.role) {
            return item.roles.includes('reader');
        }
        return item.roles.includes(profile.role);
    });

    if (loading) {
        return (
            <div className="hidden md:flex gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-16 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                ))}
            </div>
        );
    }

    return (
        <div className="hidden md:flex gap-6">
            {visibleItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                    {item.label}
                </Link>
            ))}
        </div>
    );
}

export function MobileRoleBasedNavigation() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.profile || { role: null });
                } else {
                    setProfile({ role: null });
                }
            } catch {
                setProfile({ role: null });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const visibleItems = navItems.filter(item => {
        if (!profile || !profile.role) {
            return item.roles.includes('reader');
        }
        return item.roles.includes(profile.role);
    });

    if (loading) {
        return (
            <div className="md:hidden flex gap-4 mt-3 overflow-x-auto pb-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                ))}
            </div>
        );
    }

    return (
        <div className="md:hidden flex gap-4 mt-3 overflow-x-auto pb-2">
            {visibleItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap"
                >
                    {item.shortLabel || item.label}
                </Link>
            ))}
        </div>
    );
}
