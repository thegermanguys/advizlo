// Thin fetch wrapper around the Advizlo backend API.
// Mirrors mobile/src/lib/api.ts intentionally - same shapes, same endpoints,
// different storage mechanism for the token (localStorage vs SecureStore).

export type Role = 'CLIENT' | 'CONSULTANT' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
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
  price: string; // Prisma Decimal serializes as string over JSON
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
  refunded?: boolean; // only present on the response to a cancel call
}

export interface VideoStatus {
  dailyEnabled: boolean;
  zoomConnected: boolean;
  googleConnected: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'advizlo_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
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

  updateMe: (payload: { fullName?: string; phone?: string }) =>
    request<AuthUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  categories: () => request<Category[]>('/categories'),

  // --- Consultant profile / onboarding ---
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

  // --- Pricing (service types) ---
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

  // --- Availability ---
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

  startZoomConnect: () =>
    request<{ url: string }>('/video/zoom/connect'),

  startGoogleConnect: () =>
    request<{ url: string }>('/video/google/connect'),

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

    setConsultantCommission: (consultantId: string, commissionRateOverride: number | null) =>
      request<ConsultantProfile>(`/admin/consultants/${consultantId}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRateOverride }),
      }),

    listCategories: () => request<Category[]>('/admin/categories'),

    setCategoryCommission: (categoryId: string, commissionRateOverride: number | null) =>
      request<Category>(`/admin/categories/${categoryId}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRateOverride }),
      }),

    getStats: () => request<AdminStats>('/admin/stats'),

    listRecentBookings: () => request<Booking[]>('/admin/bookings'),
  },
};
