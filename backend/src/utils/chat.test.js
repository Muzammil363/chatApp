import test from "node:test";
import assert from "node:assert/strict";
import { generateChatId, toClientMessage, toPendingClientMessage, toSeenReceiptPayload } from "./chat.js";

test("generateChatId is stable regardless of user order", () => {
    assert.equal(
        generateChatId("b@example.com", "a@example.com"),
        generateChatId("a@example.com", "b@example.com")
    );
});

test("toClientMessage returns only the current user's encrypted payload", () => {
    const message = {
        _id: "1",
        chatId: "chat-1",
        mid: new Date(1),
        sender: "a@example.com",
        message: "fallback",
        encryptedFor: [
            { userEmail: "a@example.com", ciphertext: "for-a" },
            { userEmail: "b@example.com", ciphertext: "for-b" }
        ],
        createdAt: "1"
    };

    assert.equal(toClientMessage(message, "b@example.com").message, "for-b");
});

test("toPendingClientMessage returns only the recipient pending payload", () => {
    const message = {
        _id: "pending-1",
        chatId: "chat-1",
        clientMessageId: "client-1",
        sender: "a@example.com",
        encryptedFor: [
            { userEmail: "b@example.com", ciphertext: "for-b" },
            { userEmail: "c@example.com", ciphertext: "for-c" }
        ],
        createdAt: "100"
    };

    const payload = toPendingClientMessage(message, "c@example.com", "sender-public-key");

    assert.equal(payload.serverId, "pending-1");
    assert.equal(payload.encryptedPayload, "for-c");
    assert.equal(payload.senderPublicKey, "sender-public-key");
    assert.equal(payload.chatId, "chat-1");
});

test("toSeenReceiptPayload marks allSeen only after every active recipient has seen", () => {
    const partial = toSeenReceiptPayload(
        {
            chatId: "group-1",
            serverId: "server-1",
            clientMessageId: "client-1",
            sender: "a@example.com",
            seenBy: ["b@example.com"]
        },
        ["a@example.com", "b@example.com", "c@example.com"]
    );

    assert.equal(partial.allSeen, false);

    const complete = toSeenReceiptPayload(
        {
            chatId: "group-1",
            serverId: "server-1",
            clientMessageId: "client-1",
            sender: "a@example.com",
            seenBy: ["b@example.com", "c@example.com"]
        },
        ["a@example.com", "b@example.com", "c@example.com"]
    );

    assert.equal(complete.allSeen, true);
});
