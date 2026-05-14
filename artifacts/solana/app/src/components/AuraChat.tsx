import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
}

export interface AuraChatProps {
  onSend?: (msg: string) => Promise<string>;
  initialGreeting?: string;
}

const MOCK_REPLIES = [
  'Great check-in. Try a 4-7-8 breathing cycle now to settle your nervous system.',
  'Your momentum looks strong today. Keep strain moderate and protect recovery windows.',
  'Hydration + a short walk can quickly improve focus and HRV trends.',
  'If stress is elevated, reduce intensity and prioritize sleep routine consistency tonight.',
  'Nice work. A 10-minute wind-down can help keep your biometrics stable tomorrow.',
  'Try pairing deep breathing with light stretching for better post-session recovery.',
];

const getMockReply = async (): Promise<string> => {
  const delay = 700 + Math.floor(Math.random() * 900);
  await new Promise((resolve) => setTimeout(resolve, delay));
  return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
};

export const AuraChat: React.FC<AuraChatProps> = ({ onSend, initialGreeting }) => {
  const greeting = useMemo(
    () => initialGreeting ?? 'Hey, I’m Aura. Tell me how your mind and body feel right now.',
    [initialGreeting],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      role: 'assistant',
      text: greeting,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const replyText = onSend ? await onSend(text) : await getMockReply();
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          text: 'I hit a connection issue. Try sending that again in a moment.',
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [input, onSend, sending]);

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text style={styles.bubbleText}>{item.text}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[Colors.solana.purple, '#1E1B4B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="sparkles-outline" size={18} color={Colors.textPrimary} />
        <Text style={styles.headerTitle}>Aura Coach</Text>
      </LinearGradient>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.composerWrap}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Share how you feel..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.textPrimary} />
          ) : (
            <Ionicons name="send" size={16} color={Colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  headerTitle: {
    marginLeft: spacing.sm,
    color: Colors.textPrimary,
    ...(typography.h3 as object),
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  messageRow: {
    marginBottom: spacing.sm,
    maxWidth: '88%',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  assistantRow: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubble: {
    backgroundColor: Colors.solana.purple,
    borderTopRightRadius: borderRadius.sm,
    ...(shadows.sm as object),
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.solana.green,
    borderTopLeftRadius: borderRadius.sm,
  },
  bubbleText: {
    color: Colors.textPrimary,
    ...(typography.caption as object),
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#121A2A',
    color: Colors.textPrimary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#243247',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...(typography.caption as object),
  },
  sendButton: {
    marginLeft: spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.solana.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...(shadows.glow as object),
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
