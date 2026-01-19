import Header from "@/components/Header";
import StockChat from "@/components/StockChat";

const Chat = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">AI Stock Market Assistant</h1>
          <StockChat />
        </div>
      </main>
    </div>
  );
};

export default Chat;

