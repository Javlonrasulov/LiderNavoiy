/** Xabarlar tabi va ochiq suhbat — popup ko'rsatmaslik uchun */
let onMessagesTab = false;
let activeConversationId: string | null = null;
let openConversationHandler: ((convId: string) => void) | null = null;

export function setMessagesTabActive(active: boolean) {
  onMessagesTab = active;
}

export function setActiveConversationId(id: string | null) {
  activeConversationId = id;
}

export function shouldSuppressPopup(conversationId: string) {
  return onMessagesTab && activeConversationId === conversationId;
}

export function registerOpenConversationHandler(fn: ((convId: string) => void) | null) {
  openConversationHandler = fn;
}

let pendingOpenConversationId: string | null = null;

export function setPendingOpenConversation(id: string) {
  pendingOpenConversationId = id;
}

export function consumePendingOpenConversation(): string | null {
  const id = pendingOpenConversationId;
  pendingOpenConversationId = null;
  return id;
}

export function openConversation(convId: string) {
  setPendingOpenConversation(convId);
  openConversationHandler?.(convId);
}
