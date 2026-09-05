import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export type Role = 'CLIENT' | 'CONSULTANT' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
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

export interface ReviewSummary {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  client: { fullName: string };
}

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
  averageRating?: number | null;
  reviewCount?: number;
  reviews?: ReviewSummary[];
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
  review?: { rating: number; comment: string | null } | null;
}

export interface VideoStatus {
  dailyEnabled: boolean;
  zoomConnected: boolean;
  googleConnected: boolean;
}

// On a physical device/emulator, "localhost" refers to the device itself, not
// your dev machine. Set this to your machine's LAN IP (e.g. http://192.168.1.20:3001)
// in app.json -> expo.extra.apiUrl, or use `expo start` tunnel mode.
const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:3001';
const TOKEN_KEY = 'advizlo_token';

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

  // --- Reviews ---
  createReview: (payload: { bookingId: string; rating: number; comment?: string }) =>
    request<{ id: string; rating: number; comment: string | null }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getConsultantReviews: (consultantId: string) =>
    request<{ averageRating: number | null; reviewCount: number; reviews: ReviewSummary[] }>(
      `/consultants/${consultantId}/reviews`,
    ),

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
