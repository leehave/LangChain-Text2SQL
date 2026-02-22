import { Layout } from 'antd';
import ChatInterface from './components/ChatInterface.tsx';

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: 0, height: '100vh' }}>
        <ChatInterface />
      </Content>
    </Layout>
  );
}

export default App;
