import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger.js';

export class ChatwootPublicClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** Creates an axios instance scoped to a specific inbox */
  private forInbox(inboxIdentifier: string): AxiosInstance {
    const instance = axios.create({
      baseURL: `${this.baseUrl}/public/api/v1/inboxes/${inboxIdentifier}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status;
        const data = error.response?.data as Record<string, unknown> | undefined;
        const message = (data?.message as string) || (data?.error as string) || error.message;
        logger.error(`Public API error: ${status} ${message}`, {
          url: error.config?.url,
          method: error.config?.method,
        });
        throw new PublicApiError(status || 500, message, data);
      },
    );

    return instance;
  }

  private conversationPath(contactIdentifier: string, conversationId?: number): string {
    const path = `/contacts/${encodeURIComponent(contactIdentifier)}/conversations`;
    return conversationId === undefined ? path : `${path}/${conversationId}`;
  }

  // ─── Contacts ────────────────────────────────────────────

  async createContact(inboxIdentifier: string, data: {
    identifier?: string;
    identifier_hash?: string;
    email?: string;
    name?: string;
    phone_number?: string;
    avatar_url?: string;
    custom_attributes?: Record<string, unknown>;
  }): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.post('/contacts', data);
    return res.data;
  }

  async getContact(inboxIdentifier: string, contactIdentifier: string): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.get(`/contacts/${encodeURIComponent(contactIdentifier)}`);
    return res.data;
  }

  async updateContact(inboxIdentifier: string, contactIdentifier: string, data: {
    name?: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
    custom_attributes?: Record<string, unknown>;
  }): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.patch(`/contacts/${encodeURIComponent(contactIdentifier)}`, data);
    return res.data;
  }

  // ─── Conversations ──────────────────────────────────────

  async createConversation(inboxIdentifier: string, contactIdentifier: string, data: {
    custom_attributes?: Record<string, unknown>;
  }): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.post(this.conversationPath(contactIdentifier), data);
    return res.data;
  }

  async listConversations(inboxIdentifier: string, contactIdentifier: string): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.get(this.conversationPath(contactIdentifier));
    return res.data;
  }

  async getConversation(inboxIdentifier: string, contactIdentifier: string, conversationId: number): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.get(this.conversationPath(contactIdentifier, conversationId));
    return res.data;
  }

  async resolveConversation(inboxIdentifier: string, contactIdentifier: string, conversationId: number): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.post(`${this.conversationPath(contactIdentifier, conversationId)}/toggle_status`);
    return res.data;
  }

  async toggleTyping(inboxIdentifier: string, conversationId: number, data: {
    typing_status: 'on' | 'off';
    contact_identifier: string;
  }): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const path = `${this.conversationPath(data.contact_identifier, conversationId)}/toggle_typing`;
    const res = await http.post(path, undefined, { params: { typing_status: data.typing_status } });
    return res.data;
  }

  async updateLastSeen(inboxIdentifier: string, conversationId: number, data: {
    contact_identifier: string;
  }): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const path = `${this.conversationPath(data.contact_identifier, conversationId)}/update_last_seen`;
    const res = await http.post(path);
    return res.data;
  }

  // ─── Messages ───────────────────────────────────────────

  async createMessage(inboxIdentifier: string, conversationId: number, data: {
    content: string;
    echo_id?: string;
    contact_identifier: string;
  }): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const { contact_identifier, ...body } = data;
    const res = await http.post(`${this.conversationPath(contact_identifier, conversationId)}/messages`, body);
    return res.data;
  }

  async listMessages(inboxIdentifier: string, contactIdentifier: string, conversationId: number): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.get(`${this.conversationPath(contactIdentifier, conversationId)}/messages`);
    return res.data;
  }

  async updateMessage(inboxIdentifier: string, contactIdentifier: string, conversationId: number, messageId: number, data: {
    submitted_values?: Record<string, unknown>;
  }): Promise<unknown> {
    const http = this.forInbox(inboxIdentifier);
    const res = await http.patch(`${this.conversationPath(contactIdentifier, conversationId)}/messages/${messageId}`, data);
    return res.data;
  }
}

export class PublicApiError extends Error {
  statusCode: number;
  data?: Record<string, unknown>;

  constructor(statusCode: number, message: string, data?: Record<string, unknown>) {
    super(message);
    this.name = 'PublicApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}
