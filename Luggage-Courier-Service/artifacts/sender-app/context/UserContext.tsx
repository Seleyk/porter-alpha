import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import createContextHook from "@nkzw/create-context-hook";
import React, { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";

export type UserRole = "sender" | "courier";

export type UserProfile = {
  id: string;
  deviceId?: string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  role: UserRole;
  isOnline: boolean;
  totalDeliveries: number;
  rating?: number | null;
};

type UserContextValue = {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
};

const USER_STORAGE_KEY = "@porter/user";
const TOKEN_SECURE_KEY = "porter_session_token";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

async function secureGet(key: string): Promise<string | null> {
  if (isNative) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return await AsyncStorage.getItem(key);
    }
  }
  return AsyncStorage.getItem(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (isNative) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {}
  }
  await AsyncStorage.setItem(key, value);
}

async function secureRemove(key: string): Promise<void> {
  if (isNative) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  }
  await AsyncStorage.removeItem(key);
}

export function getDeviceId(): string {
  return `device_${Date.now().toString()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getDisplayName(user: UserProfile): string {
  if (user.firstName) return user.firstName;
  if (user.name) return user.name.split(" ")[0];
  return "there";
}

export function authedFetch(token: string | null, url: string, init?: RequestInit): Promise<Response> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...init, headers });
}

const [UserProvider, useUser] = createContextHook<UserContextValue>(() => {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(USER_STORAGE_KEY),
      secureGet(TOKEN_SECURE_KEY),
    ]).then(([storedUser, storedToken]) => {
      if (storedUser) {
        try { setUserState(JSON.parse(storedUser)); } catch {}
      }
      if (storedToken) setTokenState(storedToken);
      setIsLoading(false);
    });
  }, []);

  const setUser = useCallback((u: UserProfile | null) => {
    setUserState(u);
    if (u) {
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    } else {
      AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (t) {
      secureSet(TOKEN_SECURE_KEY, t);
    } else {
      secureRemove(TOKEN_SECURE_KEY);
    }
  }, []);

  const updateUser = useCallback((partial: Partial<UserProfile>) => {
    setUserState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    const currentToken = token;
    setUserState(null);
    setTokenState(null);
    await Promise.all([
      AsyncStorage.removeItem(USER_STORAGE_KEY),
      secureRemove(TOKEN_SECURE_KEY),
    ]);
    if (currentToken) {
      try {
        await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {}
    }
  }, [token]);

  return { user, token, isLoading, setUser, setToken, updateUser, logout };
}, "UserContext");

export { UserProvider, useUser };
