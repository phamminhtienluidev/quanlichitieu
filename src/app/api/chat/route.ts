import { NextResponse } from 'next/server';
import { stripChatMarkdown } from '@/lib/stripChatMarkdown';

export async function POST(req: Request) {
  try {
    const { messages, contextData } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    const model =
      process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vui lòng thiết lập GEMINI_API_KEY trong file .env.local' },
        { status: 500 }
      );
    }

    const period = contextData.periodLabel ?? 'tháng hiện tại';
    const expenseByCat = contextData.expenseByCategory ?? [];
    const incomeByCat = contextData.incomeByCategory ?? [];
    const budgetsUsage = contextData.budgetsWithUsage ?? [];
    const recent = contextData.recentTransactions ?? [];
    const cats = contextData.categoriesSummary ?? [];

    const systemText = `Bạn là "Trợ lý thông minh", chuyên gia phân tích tài chính cá nhân.

QUAN TRỌNG: Đoạn JSON dưới đây là dữ liệu THẬT do ứng dụng "Quản lý chi tiêu" của người dùng đồng bộ lên mỗi lần họ chat (kỳ ${period}). Bạn PHẢI dựa vào các số liệu này để phân tích và khuyến nghị. Tuyệt đối KHÔNG nói rằng bạn không có quyền truy cập hay không biết thu chi của họ nếu dữ liệu đã được cung cấp (kể cả khi một số chỉ tiêu bằng 0 hoặc danh sách rỗng — hãy giải thích nhẹ nhàng là chưa có ghi nhận trong kỳ đó).

Tổng quan (VND):
- Số dư lũy kế (theo tổng thu − chi đến hôm nay): ${contextData.netWorth}
- Tổng thu trong kỳ: ${contextData.totalIncome}
- Tổng chi trong kỳ: ${contextData.totalExpense}

Chi tiêu theo danh mục (đã sắp xếp, phần trăm là % trên tổng chi tháng):
${JSON.stringify(expenseByCat)}

Thu nhập theo danh mục:
${JSON.stringify(incomeByCat)}

Ngân sách tháng (hạn mức vs đã chi, nếu có):
${JSON.stringify(budgetsUsage)}

Giao dịch gần đây trong kỳ (tối đa 25 bản ghi):
${JSON.stringify(recent)}

Danh mục người dùng đang dùng trong app:
${JSON.stringify(cats)}

Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. Khi so sánh khoản chi, trích dẫn đúng tên danh mục và số từ dữ liệu.

ĐỊNH DẠNG: Viết văn bản thuần (plain text) cho người dùng cuối. TUYỆT ĐỐI KHÔNG dùng Markdown hay ký hiệu định dạng: không dùng ** hoặc __ để in đậm, không bọc từ bằng * hoặc _ để in nghiêng, không dùng # tiêu đề.`;

    const formattedContents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // gemini-1.5-flash is no longer available on v1; use a current model (default: gemini-2.5-flash).
    // Override with GEMINI_MODEL in .env.local if needed.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemText }],
          },
          contents: formattedContents,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || 'Có lỗi xảy ra khi gọi Gemini API' },
        { status: response.status }
      );
    }

    const raw =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Tôi không thể trả lời lúc này.";
    const aiMessage = stripChatMarkdown(raw);

    return NextResponse.json({ message: aiMessage });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
