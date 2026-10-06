import type {
  AuthStatusResponse,
  SendCodeResponse,
  SignInResponse,
  ChatSummary,
  ChatMessage,
  TelegramContact,
  GroupDetail,
  ChannelDetail,
  UserProfile,
  GlobalSearchResult,
  AccountInfo,
  AccountsResponse,
  CallLog,
} from '@/shared/types';

class ApiClient {
  private customBaseUrl: string = '';
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.customBaseUrl = localStorage.getItem('gram_backend_url') || '';
      this.token = localStorage.getItem('gram_auth_token') || null;
    }
  }

  public setBackendUrl(url: string) {
    this.customBaseUrl = url.replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      if (this.customBaseUrl) {
        localStorage.setItem('gram_backend_url', this.customBaseUrl);
      } else {
        localStorage.removeItem('gram_backend_url');
      }
    }
  }

  public getBackendUrl(): string {
    return this.customBaseUrl;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('gram_auth_token', token);
      } else {
        localStorage.removeItem('gram_auth_token');
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public getBaseUrl(): string {
    if (this.customBaseUrl) return this.customBaseUrl;
    if (typeof window !== 'undefined') {
      const viteEnv = (import.meta as any).env?.VITE_API_URL;
      if (viteEnv) return String(viteEnv).replace(/\/+$/, '');
    }
    return '';
  }

  public getWsUrl(): string {
    const token = this.getToken();
    if (this.customBaseUrl) {
      const cleaned = this.customBaseUrl.replace(/^http/, 'ws');
      return `${cleaned}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }
    if (typeof window !== 'undefined') {
      const envWs = (import.meta as any).env?.VITE_WS_URL;
      if (envWs) {
        const cleaned = String(envWs).replace(/\/+$/, '');
        return `${cleaned.startsWith('ws') ? cleaned : cleaned.replace(/^http/, 'ws')}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      }
      const envApi = (import.meta as any).env?.VITE_API_URL;
      if (envApi) {
        const cleaned = String(envApi).replace(/\/+$/, '').replace(/^http/, 'ws');
        return `${cleaned}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }
    return '';
  }

  public getMediaUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    const base = this.getBaseUrl();
    const full = (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://'))
      ? relativeUrl
      : `${base}${relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`}`;

    const token = this.getToken();
    if (token && !full.includes('token=')) {
      const sep = full.includes('?') ? '&' : '?';
      return `${full}${sep}token=${encodeURIComponent(token)}`;
    }
    return full;
  }

  public getAvatarUrl(peerId: string): string {
    return this.getMediaUrl(`/api/media/avatar/${peerId}`);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const base = this.getBaseUrl();
    const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.error || errorJson.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json();
  }

  public async getAuthStatus(): Promise<AuthStatusResponse> {
    const res = await this.request<AuthStatusResponse>('/api/auth/status');
    if (res.authenticated && (res.token || res.sessionId)) {
      this.setToken(res.token || res.sessionId || null);
    }
    return res;
  }

  public async sendCode(phoneNumber: string, apiId?: number, apiHash?: string): Promise<SendCodeResponse> {
    return this.request<SendCodeResponse>('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, apiId, apiHash }),
    });
  }

  public async verifyCode(tempSessionId: string, code: string): Promise<SignInResponse> {
    const res = await this.request<SignInResponse>('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ tempSessionId, code }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async verify2FA(tempSessionId: string, password: string): Promise<SignInResponse> {
    const res = await this.request<SignInResponse>('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempSessionId, password }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  public async getAccounts(): Promise<AccountsResponse> {
    return this.request<AccountsResponse>('/api/accounts');
  }

  public async switchAccount(sessionId: string): Promise<SignInResponse> {
    const res = await this.request<SignInResponse>('/api/accounts/switch', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async logoutAccount(sessionId: string): Promise<any> {
    return this.request('/api/accounts/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  public async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/me');
  }

  public async getChats(limit: number = 50): Promise<ChatSummary[]> {
    return this.request<ChatSummary[]>(`/api/chats?limit=${limit}`);
  }

  public async pinChat(chatId: string, pinned: boolean): Promise<void> {
    await this.request(`/api/chats/${encodeURIComponent(chatId)}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinned }),
    });
  }

  public async archiveChat(chatId: string, archived: boolean): Promise<void> {
    await this.request(`/api/chats/${encodeURIComponent(chatId)}/archive`, {
      method: 'POST',
      body: JSON.stringify({ archived }),
    });
  }

  public async getMessages(chatId: string, limit: number = 50, offsetId?: number): Promise<ChatMessage[]> {
    const query = new URLSearchParams({ limit: String(limit) });
    if (offsetId) query.set('offsetId', String(offsetId));
    return this.request<ChatMessage[]>(`/api/messages/${encodeURIComponent(chatId)}?${query.toString()}`);
  }

  public async sendMessage(chatId: string, text: string, replyToMsgId?: number): Promise<ChatMessage> {
    return this.request<ChatMessage>(`/api/messages/${encodeURIComponent(chatId)}`, {
      method: 'POST',
      body: JSON.stringify({ text, replyToMsgId }),
    });
  }

  public async editMessage(chatId: string, msgId: number, text: string): Promise<void> {
    await this.request(`/api/messages/${encodeURIComponent(chatId)}/${msgId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  }

  public async deleteMessage(chatId: string, msgId: number): Promise<void> {
    await this.request(`/api/messages/${encodeURIComponent(chatId)}/${msgId}`, {
      method: 'DELETE',
    });
  }

  public async forwardMessage(fromChatId: string, toChatId: string, messageId: number): Promise<void> {
    await this.request(`/api/messages/${encodeURIComponent(toChatId)}/forward`, {
      method: 'POST',
      body: JSON.stringify({ fromChatId, messageId }),
    });
  }

  public async sendMedia(
    chatId: string,
    base64Data: string,
    filename: string,
    caption?: string,
    replyToMsgId?: number
  ): Promise<ChatMessage> {
    return this.request<ChatMessage>(`/api/messages/${encodeURIComponent(chatId)}/media`, {
      method: 'POST',
      body: JSON.stringify({ base64Data, filename, caption, replyToMsgId }),
    });
  }

  public async markChatRead(chatId: string, maxId?: number): Promise<void> {
    await this.request(`/api/messages/${encodeURIComponent(chatId)}/read`, {
      method: 'POST',
      body: JSON.stringify({ maxId }),
    });
  }

  public async sendTyping(chatId: string, action: string = 'typing'): Promise<void> {
    await this.request(`/api/messages/${encodeURIComponent(chatId)}/typing`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  public async getContacts(): Promise<TelegramContact[]> {
    return this.request<TelegramContact[]>('/api/contacts');
  }

  public async getGroupDetail(chatId: string): Promise<GroupDetail> {
    return this.request<GroupDetail>(`/api/groups/${encodeURIComponent(chatId)}`);
  }

  public async getChannelDetail(channelId: string): Promise<ChannelDetail> {
    return this.request<ChannelDetail>(`/api/channels/${encodeURIComponent(channelId)}`);
  }

  public async joinChannel(channelId: string): Promise<void> {
    await this.request(`/api/channels/${encodeURIComponent(channelId)}/join`, {
      method: 'POST',
    });
  }

  public async leaveChannel(channelId: string): Promise<void> {
    await this.request(`/api/channels/${encodeURIComponent(channelId)}/leave`, {
      method: 'POST',
    });
  }

  public async searchGlobal(query: string): Promise<GlobalSearchResult> {
    return this.request<GlobalSearchResult>(`/api/search?q=${encodeURIComponent(query)}`);
  }

  public async getPostComments(channelId: string, postId: number): Promise<any[]> {
    return this.request<any[]>(`/api/channels/${encodeURIComponent(channelId)}/posts/${postId}/comments`);
  }

  public async sendPostComment(channelId: string, postId: number, text: string): Promise<any> {
    return this.request<any>(`/api/channels/${encodeURIComponent(channelId)}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  public async updateProfile(data: { firstName?: string; lastName?: string; bio?: string; about?: string; username?: string; photoBase64?: string }): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio ?? data.about,
        username: data.username,
        photoBase64: data.photoBase64,
      }),
    });
  }

  public async uploadProfilePhoto(base64Data: string): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ base64Data }),
    });
  }

  public async addContact(phone: string, firstName: string, lastName?: string): Promise<TelegramContact> {
    return this.request<TelegramContact>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ phone, firstName, lastName }),
    });
  }

  public async getCallHistory(limit: number = 50): Promise<CallLog[]> {
    return this.request<CallLog[]>(`/api/calls?limit=${limit}`);
  }

  public async getCalls(limit: number = 50): Promise<CallLog[]> {
    return this.getCallHistory(limit);
  }

  public async getCallConfig(): Promise<any> {
    return this.request<any>('/api/calls/config');
  }

  public async requestCall(userId: string, isVideo: boolean = false): Promise<any> {
    return this.request<any>('/api/calls/request', {
      method: 'POST',
      body: JSON.stringify({ userId, isVideo }),
    });
  }

  public async acceptCall(callId: string, accessHash: string, isVideo: boolean = false): Promise<any> {
    return this.request<any>('/api/calls/accept', {
      method: 'POST',
      body: JSON.stringify({ callId, accessHash, isVideo }),
    });
  }

  public async confirmCall(callId: string, accessHash: string, gBBase64?: string): Promise<any> {
    return this.request<any>('/api/calls/confirm', {
      method: 'POST',
      body: JSON.stringify({ callId, accessHash, gBBase64 }),
    });
  }

  public async discardCall(callId: string, duration: number = 0, isVideo: boolean = false): Promise<any> {
    return this.request<any>('/api/calls/discard', {
      method: 'POST',
      body: JSON.stringify({ callId, duration, isVideo }),
    });
  }
}

export const apiClient = new ApiClient();
