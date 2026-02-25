# 从零搭建一个 LangChain 聊天机器人：我们的踩坑实录

去年下半年，团队接到了一个内部需求：做一个支持多模型切换的 AI 聊天工具，最好还能处理文件上传、保留对话历史。听起来不算复杂，但真动手做起来，发现里面门道不少。这篇文章记录了我们从零搭建到上线的完整过程，包括技术选型、架构设计和一些血泪教训。

## 一、为什么要做这个项目

说实话，最开始我们也没想自己造轮子。市面上现成的聊天工具不少，但用起来总觉得差点意思：有的不支持国内模型，有的文件上传功能很鸡肋，还有的历史记录管理做得一塌糊涂。更重要的是，我们希望这个工具能深度集成到现有的工作流里，而不是孤零零的一个应用。

于是决定自己动手。需求很明确：

- 支持 Claude、DeepSeek 等主流模型，能随时切换
- 流式响应，打字机效果不能少
- 文件上传功能，至少支持代码文件和文档
- 对话历史持久化，刷新页面不丢记录
- 最好再有个 Text-to-SQL 的彩蛋功能

## 二、技术选型：为什么选这套组合

### 后端：NestJS + LangChain

一开始我们考虑过直接用 Express 或者 Fastify 这种轻量框架，毕竟只是个聊天接口。但后来发现，随着功能增加，代码会越来越散。NestJS 的模块化设计虽然前期有点重，但长期来看，代码结构清晰很多。

LangChain 的选择比较自然。我们本来就要对接多个模型，LangChain 的统一接口省了不少事。不过说实话，LangChain 的文档有时候让人头疼，特别是 streaming 相关的部分，例子少得可怜，很多细节得自己翻源码。

### 前端：React + Ant Design X

UI 框架选 Ant Design X 是个挺冒险的决定。当时这个库刚出来没多久，但看它的设计理念很对胃口：专门为 AI 场景设计的组件，气泡对话、流式输出、文件附件这些功能都是现成的。

实际用下来，AntDX 确实省了不少事。比如那个 `Bubble.List` 组件，自动处理消息渲染和滚动，不用自己写一堆 useEffect。但坑也有，文档更新跟不上版本，有些 props 改了但文档没同步，得去 GitHub issues 里翻。

### 工程化：pnpm workspaces

这个项目是前后端分离的，我们决定用 monorepo 管理。pnpm workspaces 比 Turborepo 轻量，配置简单，共享类型也很方便。

```
.
├── apps/
│   ├── server/          # NestJS 后端
│   └── web/             # React 前端
└── packages/
    └── shared/          # 共享类型定义
```

最大的好处是类型安全。`packages/shared` 里定义了 `ChatMessage`、`Conversation` 这些核心类型，前后端共用，改一处两边都生效，不用担心接口对不上。

## 三、核心功能实现：那些踩过的坑

### 1. 流式输出的 SSE 实现

流式输出是聊天机器人的灵魂，但实现起来比想象中麻烦。

我们的方案是后端用 SSE（Server-Sent Events）推送，前端用 EventSource 接收。NestJS 里这样写：

```typescript
async streamChat(
  conversation: Conversation,
  message: string,
  res: Response,
): Promise<void> {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendChunk = (chunk: StreamChunk) => {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  };

  // 调用模型流式接口
  await this.llmService.streamChat(conversation.messages, {
    onToken: (token: string) => {
      sendChunk({ type: 'token', data: token });
    },
    onError: (error: Error) => {
      sendChunk({ type: 'error', data: error.message });
      res.end();
    },
    onComplete: () => {
      sendChunk({ type: 'done', data: '...' });
      res.end();
    },
  });
}
```

看起来简单，但这里有个大坑：不同模型的流式输出格式不一样。Claude 的 chunk 结构跟 DeepSeek 有细微差别，特别是 content 字段，有时候是字符串，有时候是数组。我们不得不加了一堆防御性代码：

```typescript
for await (const chunk of stream) {
  const content = chunk.content;
  if (typeof content === 'string') {
    callbacks.onToken(content);
  } else if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === 'string') {
        callbacks.onToken(item);
      } else if (item && typeof item === 'object' && 'text' in item) {
        callbacks.onToken((item as { text: string }).text);
      }
    }
  }
}
```

前端接收也有讲究。我们一开始用 axios，发现处理 stream 很麻烦，后来直接用原生 fetch：

```typescript
const response = await fetch(`${API_URL}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, conversationId }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      // 处理 token、error、done 三种消息类型
    }
  }
}
```

这里要注意 `decoder.decode(value, { stream: true })` 的 `stream` 参数，必须设为 true，否则中文会被截断成乱码。这个坑踩了整整一个下午。

### 2. 状态管理：Zustand 的妙用

前端状态管理我们选了 Zustand，比 Redux 轻量，比 Context 性能好。

聊天应用的状态有个特点：既有持久化的对话历史，又有临时的流式消息。我们设计了两个独立的状态：

```typescript
interface ChatState {
  conversations: Conversation[];        // 持久化的对话列表
  currentConversationId: string | null; // 当前选中的对话
  isLoading: boolean;                   // 是否正在等待响应
  streamingMessage: string;             // 临时流式消息
}
```

`streamingMessage` 单独存很重要。如果直接往 `conversations` 里追加，每次 token 过来都要深拷贝整个数组，性能很差。分开存后，只有最后确认消息完成时才写进历史。

```typescript
// 收到 token 时，只更新临时消息
appendToStreamingMessage: (token) =>
  set((state) => ({
    streamingMessage: state.streamingMessage + token,
  })),

// 流式结束后，写入历史并清空临时消息
addMessage: (conversationId, message) =>
  set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
        : c
    ),
  })),
```

### 3. 文件上传的架构设计

文件上传我们做了分层处理。Controller 只负责接收和存储文件，业务逻辑交给 Service。

```typescript
@Controller('api')
export class UploadController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        // 文件类型白名单校验
        const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', ...];
        const allowedExtensions = ['.txt', '.md', '.pdf', '.js', '.ts', ...];
        // ...
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 限制
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    // 返回文件元数据，不处理内容
    return {
      success: true,
      file: {
        id: generateId(),
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
      },
    };
  }
}
```

这样设计的好处是职责清晰。如果以后要接入云存储（比如 OSS），只需要改 storage 配置，业务代码不用动。文件内容解析（比如 PDF 转文本、代码提取）放在聊天服务里按需处理，而不是上传时就做。

### 4. LangChain 的使用心得

LangChain 是个双刃剑。它确实简化了很多工作，比如消息格式转换：

```typescript
private convertToLangChainMessages(messages: ChatMessage[]) {
  return messages.map((msg) => {
    switch (msg.role) {
      case 'user': return new HumanMessage(msg.content);
      case 'assistant': return new AIMessage(msg.content);
      case 'system': return new SystemMessage(msg.content);
    }
  });
}
```

但我们发现，对于流式输出这种场景，LangChain 的 Chain 抽象反而碍事。直接调用模型的 `stream` 方法更灵活：

```typescript
const stream = await this.model.stream(langChainMessages);
for await (const chunk of stream) {
  // 直接处理 chunk，不用被 Chain 的回调机制束缚
}
```

LangChain 的 Chain 适合那种输入输出明确的场景，比如 Text-to-SQL：

```typescript
async textToSql(schema: string, prompt: string): Promise<string> {
  const systemPrompt = `You are a SQL expert...
Database Schema:
${schema}
Rules:
1. Return only the SQL query without any explanation
2. Use proper SQL syntax compatible with PostgreSQL
...`;

  const messages: ChatMessage[] = [
    { id: generateId(), role: 'system', content: systemPrompt, timestamp: Date.now() },
    { id: generateId(), role: 'user', content: prompt, timestamp: Date.now() },
  ];

  return await this.llmService.chat(messages);
}
```

这里有个小技巧：prompt 里明确约束输出格式（"只返回 SQL，不要解释"），比换更大的模型效果好得多。

## 四、工程化实践

### 共享类型的设计

`packages/shared` 是我们最满意的设计之一。它只导出类型和工具函数，不依赖任何框架：

```typescript
// packages/shared/src/types.ts
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
```

前后端通过 `workspace:*` 引用：

```json
{
  "dependencies": {
    "@chatbot/shared": "workspace:*"
  }
}
```

这样保证类型始终同步，重构时改一处，编译器会帮你检查所有引用。

### 环境配置管理

我们用 `.env.example` 做模板，新成员 clone 下来复制一份就能跑：

```bash
# apps/server/.env
DEEPSEEK_API_KEY=your_api_key_here
PORT=3000

# apps/web/.env
VITE_API_URL=http://localhost:3000
```

NestJS 的 `ConfigModule` 配合 Joi 做校验，启动时检查必要的环境变量，缺了就直接报错，不会跑到一半才发现。

## 五、踩过的坑和反思

### 1. SSE 重连机制

生产环境发现，长时间对话后 SSE 连接会断开。我们加了简单的重连逻辑，但更好的做法是用 EventSource polyfill 或者 socket.io。如果重新设计，可能会考虑 WebSocket。

### 2. 消息 ID 的生成

一开始用自增数字做消息 ID，后来发现并发场景下会冲突。改成 `Date.now() + Math.random()` 的组合，虽然不够优雅，但够用。

### 3. 文件存储路径

开发时文件存在 `./uploads`，生产环境部署到 Docker 里就丢了。后来改成可配置的路径，并且加了 volume 挂载。

### 4. 类型导入的一致性

TypeScript 的 `import type` 和 `import` 混用会导致一些奇怪的问题。我们后来统一规定：类型用 `import type`，值用 `import`，虽然啰嗦点但省心。

## 六、写在最后

这个项目从立项到上线大概花了一个月，其中一半时间在调 SSE 和模型接口的各种细节。最大的收获是：AI 应用的难点不在算法，在工程。流式输出的稳定性、状态管理的合理性、错误处理的完备性，这些才是决定用户体验的关键。

如果你也在做类似的项目，建议：

1. **尽早定义共享类型**，前后端对齐数据结构
2. **流式输出要加防御代码**，不同模型的响应格式可能有细微差别
3. **状态分离设计**，临时状态和持久状态分开管理
4. **文件上传分层**，存储和业务逻辑解耦
5. **Prompt 工程比换模型管用**，明确的约束往往比大模型效果好

代码已经开源，欢迎参考和提 issue。有问题也可以在评论区交流，看到都会回。

---

*本文作者：团队后端负责人，专注 Node.js 和 AI 应用开发。文章首发于个人公众号，转载请注明出处。*
