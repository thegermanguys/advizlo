import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export type Role = 'CLIENT' | 'CONSULTANT' | 'ADMIN';

export interface ProfilePhotoMeta {
  mime: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  profilePhoto?: ProfilePhotoMeta | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: Role;
  timezone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  commissionRateOverride?: number | null;
}

export type ConsultationMode =
  | 'IN_APP_VIDEO'
  | 'ZOOM'
  | 'GOOGLE_MEET'
  | 'PHONE'
  | 'IN_PERSON';

export interface ConsultantProfile {
  id: string;
  categoryId: string;
  category?: Category;
  bio: string | null;
  credentialsInfo: string | null;
  inPersonAddress: string | null;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  cancellationPolicyHours: number;
  commissionRateOverride?: number | null;
  serviceTypes?: ServiceType[];
  availability?: AvailabilityRule[];
  user?: { fullName: string };
  profilePhoto?: ProfilePhotoMeta | null;
}

export interface AdminConsultant extends ConsultantProfile {
  user: { fullName: string; email: string; createdAt: string };
  category: Category;
  _count: { serviceTypes: number; bookings: number };
}

export interface AdminStats {
  totalConsultants: number;
  approvedConsultants: number;
  pendingConsultants: number;
  totalClients: number;
  totalBookings: number;
  grossBookingValue: number;
  totalCommissionEarned: number;
}

export interface ServiceType {
  id: string;
  name: string;
  durationMins: number;
  price: string;
  currency: string;
  isFirstFree: boolean;
  active: boolean;
  consultationModes: ConsultationMode[];
}

export interface AvailabilityRule {
  id: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isBlocked: boolean;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Booking {
  id: string;
  scheduledAt: string;
  durationMins: number;
  status: BookingStatus;
  consultationMode: ConsultationMode;
  meetingLink: string | null;
  address: string | null;
  priceCharged: string;
  commissionAmount: string;
  serviceType: ServiceType;
  consultant?: { user: { fullName: string }; category?: Category };
  client?: { fullName: string; email: string };
  refunded?: boolean;
}

export interface VideoStatus {
  dailyEnabled: boolean;
  zoomConnected: boolean;
  googleConnected: boolean;
}

// EXPO_PUBLIC_API_URL is the deployed API when a device or store build should
// call Vercel. Otherwise app.config.js / app.json extra.apiUrl is used.
// On a physical device, "localhost" is the phone itself — set the var (or
// extra.apiUrl) to your machine's LAN IP, or run `expo start --tunnel`.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3001';
const TOKEN_KEY = 'advizlo_token';
const PROFILE_PHOTO_MAX_BYTES = 1_500_000;
const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function userPhotoSrc(
  user: { id: string; profilePhoto?: ProfilePhotoMeta | null } | null,
): string | null {
  if (!user?.profilePhoto) return null;
  return `${API_URL}/users/${user.id}/photo?v=${encodeURIComponent(user.profilePhoto.updatedAt)}`;
}

export function consultantPhotoSrc(
  profile: { id: string; profilePhoto?: ProfilePhotoMeta | null } | null,
): string | null {
  if (!profile?.profilePhoto) return null;
  return `${API_URL}/consultants/${profile.id}/photo?v=${encodeURIComponent(profile.profilePhoto.updatedAt)}`;
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  register: (payload: RegisterPayload) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request<AuthUser>('/auth/me'),

  uploadMyPhoto: async (
    target: 'user' | 'consultant',
    file: { uri: string; mime: string; fileSize?: number },
  ) => {
    if (!PROFILE_PHOTO_TYPES.includes(file.mime)) {
      throw new Error('Use a JPEG, PNG, or WebP image.');
    }
    if (file.fileSize != null && file.fileSize > PROFILE_PHOTO_MAX_BYTES) {
      throw new Error('Profile photo must be 1.5 MB or smaller.');
    }
    const token = await getToken();
    const local = await fetch(file.uri);
    const blob = await local.blob();
    if (blob.size > PROFILE_PHOTO_MAX_BYTES) {
      throw new Error('Profile photo must be 1.5 MB or smaller.');
    }
    const path = target === 'user' ? '/users/me/photo' : '/consultants/me/photo';
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': file.mime,
      },
      body: blob,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body.message;
      throw new Error(
        Array.isArray(message) ? message.join(', ') : message ?? `Request failed with status ${res.status}`,
      );
    }
    return res.json() as Promise<ProfilePhotoMeta>;
  },

  categories: () => request<Category[]>('/categories'),

  getMyConsultantProfile: () =>
    request<ConsultantProfile>('/consultants/me/profile'),

  updateMyConsultantProfile: (payload: {
    categoryId: string;
    bio?: string;
    credentialsInfo?: string;
    inPersonAddress?: string;
    cancellationPolicyHours?: number;
  }) =>
    request<ConsultantProfile>('/consultants/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  listMyServiceTypes: () =>
    request<ServiceType[]>('/consultants/me/service-types'),

  createServiceType: (payload: {
    name: string;
    durationMins: number;
    price: number;
    currency?: string;
    isFirstFree?: boolean;
    consultationModes: ConsultationMode[];
  }) =>
    request<ServiceType>('/consultants/me/service-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteServiceType: (id: string) =>
    request<ServiceType>(`/consultants/me/service-types/${id}`, {
      method: 'DELETE',
    }),

  listMyAvailability: () =>
    request<AvailabilityRule[]>('/consultants/me/availability'),

  createAvailability: (payload: {
    dayOfWeek?: number;
    specificDate?: string;
    startTime: string;
    endTime: string;
    isRecurring?: boolean;
    isBlocked?: boolean;
  }) =>
    request<AvailabilityRule>('/consultants/me/availability', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteAvailability: (id: string) =>
    request<AvailabilityRule>(`/consultants/me/availability/${id}`, {
      method: 'DELETE',
    }),

  // --- Browse & booking (client-side) ---
  listConsultants: (categoryId?: string) =>
    request<ConsultantProfile[]>(
      `/consultants${categoryId ? `?categoryId=${categoryId}` : ''}`,
    ),

  getConsultant: (id: string) =>
    request<ConsultantProfile>(`/consultants/${id}`),

  getAvailableSlots: (consultantId: string, serviceTypeId: string, date: string) =>
    request<string[]>(
      `/consultants/${consultantId}/available-slots?serviceTypeId=${serviceTypeId}&date=${date}`,
    ),

  createBooking: (payload: {
    consultantId: string;
    serviceTypeId: string;
    scheduledAt: string;
    consultationMode: ConsultationMode;
  }) =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listMyBookingsAsClient: () => request<Booking[]>('/bookings/me'),

  listMyBookingsAsConsultant: () =>
    request<Booking[]>('/bookings/consultant/me'),

  cancelBooking: (id: string) =>
    request<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' }),

  // --- Payments ---
  startConnectOnboarding: () =>
    request<{ url: string }>('/payments/connect/onboard', { method: 'POST' }),

  getConnectStatus: () =>
    request<{
      connected: boolean;
      chargesEnabled: boolean;
      detailsSubmitted: boolean;
      payoutsEnabled?: boolean;
    }>('/payments/connect/status'),

  createCheckoutSession: (bookingId: string) =>
    request<{ url: string }>(`/payments/checkout/${bookingId}`, {
      method: 'POST',
    }),

  // --- Video ---
  getVideoStatus: () => request<VideoStatus>('/video/status'),

  startZoomConnect: () => request<{ url: string }>('/video/zoom/connect'),

  startGoogleConnect: () => request<{ url: string }>('/video/google/connect'),

  // --- Admin ---
  admin: {
    listConsultants: (status?: 'PENDING' | 'APPROVED' | 'REJECTED') =>
      request<AdminConsultant[]>(
        `/admin/consultants${status ? `?status=${status}` : ''}`,
      ),

    setVerificationStatus: (
      consultantId: string,
      status: 'PENDING' | 'APPROVED' | 'REJECTED',
    ) =>
      request<AdminConsultant>(`/admin/consultants/${consultantId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    getStats: () => request<AdminStats>('/admin/stats'),
  },
};
