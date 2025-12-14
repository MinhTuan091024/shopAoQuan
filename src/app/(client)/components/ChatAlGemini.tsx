"use client";
/* eslint-disable @next/next/no-img-element */
import { BotMessageSquare, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

interface Message {
  text: string;
  sender: "user" | "bot";
  products?: Product[];
  recommendedSizes?: string[];
}

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  stock?: number;
  brand?: string;
  availableSizes?: string[];
  quantity?: number;
  size?: string;
}

interface ChatResponse {
  message?: string;
  reply?: string;
  products?: Product[];
  recommendedSizes?: string[];
  result?: { text: string }[];
  error?: string;
}

const ChatAlGemini = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Xin chào! 👋 Tôi là trợ lý AI của Shop Áo Quần. Tôi có thể giúp bạn:\n\n• Tư vấn chọn size dựa trên chiều cao và cân nặng\n• Tìm kiếm sản phẩm phù hợp\n• Hỗ trợ về đơn hàng, thanh toán, vận chuyển\n• Tư vấn về thời trang\n\nHãy thử hỏi: \"Tôi cao 170cm nặng 65kg, mặc size gì?\" hoặc \"Shop có những sản phẩm nào?\"",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Ẩn chatbox trên các trang admin
  const shouldHideChat =
    pathname?.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/signUp";

  if (shouldHideChat) return null;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { text: userMessage, sender: "user" }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data: ChatResponse = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { text: data.error || "Có lỗi xảy ra, vui lòng thử lại.", sender: "bot" },
        ]);
      } else if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            text: data.reply || "",
            sender: "bot",
            products: data.products,
            recommendedSizes: data.recommendedSizes,
          },
        ]);
      } else if (data.message) {
        setMessages((prev) => [
          ...prev,
          { text: data.message || "", sender: "bot" },
        ]);
      } else if (data.result && data.result.length > 0) {
        const replyText = data.result[0]?.text || "Tôi không hiểu câu hỏi của bạn.";
        setMessages((prev) => [...prev, { text: replyText, sender: "bot" }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { text: data.reply || "Có lỗi xảy ra.", sender: "bot" },
        ]);
      }
    } catch (error) {
      console.error("Lỗi chatbot:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Lỗi kết nối, vui lòng thử lại sau.", sender: "bot" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId: number) => {
    router.push(`/product/${productId}`);
    setIsOpen(false);
  };

  return (
    <div className="fixed right-4 md:right-8 bottom-4 md:bottom-8 z-50">
      {/* Nút mở chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:brightness-110 text-white rounded-full p-4 shadow-[0_15px_30px_rgba(79,70,229,0.45)] hover:shadow-[0_20px_35px_rgba(79,70,229,0.55)] "
          aria-label="Mở chatbot"
        >
          <BotMessageSquare className="w-6 h-6 md:w-8 md:h-8" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            AI
          </span>
        </button>
      )}

      {/* Chatbox */}
      {isOpen && (
        <div className="w-[90vw] max-w-[420px] h-[75vh] max-h-[600px] bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.35)] flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)]" />
          <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <BotMessageSquare className="w-5 h-5" />
              <h3 className="text-base md:text-lg font-semibold">
                AI Assistant
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-red-200 transition-colors p-1 rounded-full hover:bg-blue-700"
              aria-label="Đóng chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-50/70 to-white/60 scrollbar-thin scrollbar-thumb-blue-200/70">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-4 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl transition-transform duration-200 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 text-white shadow-xl scale-[1.02]"
                      : "bg-white/90 text-gray-800 shadow-lg border border-slate-100 backdrop-blur"
                  }`}
                >
                  <div className="p-3">
                    {msg.sender === "bot" ? (
                      <div className="prose prose-sm max-w-none text-slate-700">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Hiển thị recommended sizes */}
                    {msg.recommendedSizes && msg.recommendedSizes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.recommendedSizes.map((size, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold"
                          >
                            Size {size}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hiển thị sản phẩm */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.products.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleProductClick(product.id)}
                            className="flex items-start gap-3 border border-transparent bg-white/90 backdrop-blur rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50/40 cursor-pointer transition-all duration-200 shadow-sm"
                          >
                            <img
                              src={product.image || "/Image/logo.png"}
                              alt={product.name}
                              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl shadow-inner"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/Image/logo.png";
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm md:text-base text-gray-900 truncate">
                                {product.name}
                              </p>
                              {product.brand && (
                                <p className="text-xs text-gray-500">
                                  {product.brand}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-blue-600 mt-1">
                                {Number(product.price).toLocaleString("vi-VN")}{" "}
                                VNĐ
                              </p>
                              {product.availableSizes && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Size: {product.availableSizes.join(", ")}
                                </p>
                              )}
                              {product.size && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Size: {product.size}
                                </p>
                              )}
                              {product.stock !== undefined && (
                                <p className="text-xs text-gray-500">
                                  Còn: {product.stock} sản phẩm
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/90 p-3 rounded-lg shadow-sm border border-gray-200 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-600">
                      Đang xử lý...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="p-3 md:p-4 border-t border-slate-100 bg-white/90 backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn... (VD: Tôi cao 170cm nặng 65kg)"
                className="flex-1 p-2 md:p-3 border border-gray-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300 text-sm md:text-base shadow-inner"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 text-white px-4 py-2 md:px-5 md:py-3 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 Thử: "Tôi cao 170cm nặng 65kg" hoặc "Shop có sản phẩm gì?"
            </p>
          </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAlGemini;