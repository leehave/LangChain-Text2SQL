import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout, theme, Button, Modal, Input, message, Select } from 'antd';
import { Conversations, Sender, Welcome, Bubble } from '@ant-design/x';
import {
  DeleteOutlined,
  PlusOutlined,
  PaperClipOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { ConversationsProps } from '@ant-design/x';
import { useChat } from '../hooks/useChat';
import { uploadFile, textToSql } from '../services/api';
import type { Attachment } from '@chatbot/shared';
import CodeHighlighter from './CodeHighlighter';

const { Sider, Content } = Layout;

function ChatInterface() {
  const { t } = useTranslation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const {
    conversations,
    currentConversation,
    currentConversationId,
    isLoading,
    streamingMessage,
    selectedProvider,
    availableProviders,
    loadConversations,
    sendMessage,
    createNewConversation,
    selectConversation,
    deleteConversation,
    setSelectedProvider,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Text to SQL modal state
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [schemaInput, setSchemaInput] = useState('');
  const [sqlPrompt, setSqlPrompt] = useState('');
  const [generatedSql, setGeneratedSql] = useState('');
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSend = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;
    
    const message = inputValue;
    const messageAttachments = attachments.length > 0 ? [...attachments] : undefined;
    
    setInputValue('');
    setAttachments([]);
    
    await sendMessage(message, messageAttachments);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile(file);
      if (result.success && result.file) {
        setAttachments((prev) => [...prev, result.file!]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleOpenSqlModal = () => {
    setIsSqlModalOpen(true);
    setGeneratedSql('');
  };

  const handleCloseSqlModal = () => {
    setIsSqlModalOpen(false);
    setSchemaInput('');
    setSqlPrompt('');
    setGeneratedSql('');
  };

  const handleGenerateSql = async () => {
    if (!schemaInput.trim() || !sqlPrompt.trim()) {
      message.warning(t('sqlModal.schemaLabel') + ' ' + t('sqlModal.promptLabel'));
      return;
    }

    setIsGeneratingSql(true);
    try {
      const sql = await textToSql(schemaInput, sqlPrompt, selectedProvider || undefined);
      setGeneratedSql(sql);
    } catch (error) {
      message.error(t('errors.sqlGenerateFailed'));
      console.error(error);
    } finally {
      setIsGeneratingSql(false);
    }
  };

  const conversationItems: ConversationsProps['items'] = conversations.map((conv) => ({
    key: conv.id,
    label: conv.title,
    timestamp: conv.updatedAt,
  }));

  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: t('chat.delete'),
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
    onClick: () => {
      deleteConversation(conversation.key as string);
    },
  });

  const messages = currentConversation?.messages || [];

  return (
    <Layout style={{ height: '100vh', background: '#f5f5f5' }}>
      <Sider
        width={280}
        style={{
          background: colorBgContainer,
          borderRight: '1px solid #e8e8e8',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #e8e8e8' }}>
          <Welcome
            title={t('app.title')}
            description={t('app.description')}
          />
          {availableProviders.length > 0 && (
            <Select
              value={selectedProvider || undefined}
              onChange={(value) => setSelectedProvider(value)}
              placeholder="选择模型"
              style={{ marginTop: 12, width: '100%' }}
              options={availableProviders.map((p) => ({
                value: p.type,
                label: p.name,
              }))}
            />
          )}
          <Button
            icon={<DatabaseOutlined />}
            onClick={handleOpenSqlModal}
            style={{ marginTop: 12, width: '100%' }}
          >
            {t('sidebar.textToSql')}
          </Button>
        </div>
        <div style={{ padding: 8 }}>
          <Conversations
            items={conversationItems}
            activeKey={currentConversationId || undefined}
            onActiveChange={(key) => selectConversation(key as string)}
            menu={menuConfig}
            style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
          />
        </div>
      </Sider>

      <Layout style={{ background: '#f5f5f5' }}>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 48px)',
          }}
        >
          {!currentConversation && messages.length === 0 && !streamingMessage ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Welcome
                title={t('welcome.startTitle')}
                description={t('welcome.startDescription')}
                extra={
                  <PlusOutlined
                    onClick={createNewConversation}
                    style={{ fontSize: 24, cursor: 'pointer', color: '#1677ff' }}
                  />
                }
              />
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
              <Bubble.List
                items={[
                  ...messages.map((msg) => ({
                    key: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    ...(msg.attachments && msg.attachments.length > 0 && {
                      footer: (
                        <div style={{ marginTop: 8 }}>
                          {msg.attachments.map((att) => (
                            <span
                              key={att.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                marginRight: 8,
                                padding: '2px 8px',
                                background: '#f0f0f0',
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              <PaperClipOutlined style={{ marginRight: 4 }} />
                              {att.name}
                            </span>
                          ))}
                        </div>
                      ),
                    }),
                  })),
                  ...(streamingMessage
                    ? [
                        {
                          key: 'streaming',
                          role: 'assistant' as const,
                          content: streamingMessage,
                          loading: isLoading && streamingMessage.length === 0,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}

          <div style={{ marginTop: 'auto' }}>
            {attachments.length > 0 && (
              <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {attachments.map((att) => (
                  <span
                    key={att.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      background: '#e6f4ff',
                      borderRadius: 16,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleRemoveAttachment(att.id)}
                  >
                    <PaperClipOutlined style={{ marginRight: 4 }} />
                    {att.name}
                    <span style={{ marginLeft: 4, color: '#999' }}>×</span>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Button
                icon={<PaperClipOutlined />}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileUpload(file);
                  };
                  input.click();
                }}
                disabled={uploading}
                style={{ marginTop: 4 }}
              />
              <div style={{ flex: 1 }}>
                <Sender
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSend}
                  loading={isLoading}
                  placeholder={t('chat.placeholder')}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>
        </Content>
      </Layout>

      {/* Text to SQL Modal */}
      <Modal
        title={t('sqlModal.title')}
        open={isSqlModalOpen}
        onCancel={handleCloseSqlModal}
        onOk={handleGenerateSql}
        okText={t('sqlModal.generate')}
        confirmLoading={isGeneratingSql}
        width={800}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('sqlModal.schemaLabel')}
          </label>
          <Input.TextArea
            value={schemaInput}
            onChange={(e) => setSchemaInput(e.target.value)}
            placeholder={t('sqlModal.schemaPlaceholder')}
            rows={6}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('sqlModal.promptLabel')}
          </label>
          <Input.TextArea
            value={sqlPrompt}
            onChange={(e) => setSqlPrompt(e.target.value)}
            placeholder={t('sqlModal.promptPlaceholder')}
            rows={3}
          />
        </div>
        {generatedSql && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              {t('sqlModal.resultLabel')}
            </label>
            <CodeHighlighter code={generatedSql} language="sql" />
          </div>
        )}
      </Modal>
    </Layout>
  );
}

export default ChatInterface;
