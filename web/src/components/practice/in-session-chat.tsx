"use client";

import { X } from "lucide-react";

import type { ChatMessage, ChatPartner } from "@/lib/api";
import { ConversationThread } from "@/components/chat/conversation-thread";
import { displayName, focusRing } from "@/components/practice/languages";

type Props = {
  open: boolean;
  conversationId: string;
  myId: string;
  partner?: ChatPartner | null;
  incoming?: ChatMessage | null;
  onClose: () => void;
};

export function InSessionChat({ open, conversationId, myId, partner, incoming, onClose }: Props) {
  if (!open) return null;
  const name = displayName(partner?.username ?? "Partner");

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[420px]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <div className="font-extrabold text-sm">Text chat with {name.split(" ")[0]}</div>
          <div className="text-[11px] text-muted-foreground">Voice stays live while you type</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground ${focusRing}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ConversationThread
        conversationId={conversationId}
        myId={myId}
        partner={partner}
        incoming={incoming}
        compact
      />
    </div>
  );
}
