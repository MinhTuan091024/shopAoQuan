// app/api/chat/route.ts (hoặc file tương tự)
import prisma from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");
import Fuse from "fuse.js";
import { authCustomer } from "@/utils/Auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// Danh sách từ khóa
const ORDER_KEYWORDS = [
  "đơn hàng",
  "kiểm tra đơn hàng",
  "theo dõi đơn hàng",
  "đơn của tôi",
  "đơn đâu",
  "đơn hàng của tôi",
];

const PRODUCT_KEYWORDS = [
  "shop có áo không",
  "cửa hàng có quần không",
  "sản phẩm của shop",
  "sản phẩm này còn hàng không",
  "bạn có bán giày không",
  "shop có những sản phẩm nào",
];

const SIZE_KEYWORDS = [
  "size bao nhiêu",
  "mình cao",
  "nặng",
  "mặc size gì",
  "chọn size",
  "size nào phù hợp",
  "chiều cao",
  "cân nặng",
  "kg",
  "cm",
  "mét",
];

const PAYMENT_KEYWORDS = [
  "có hỗ trợ trả góp không",
  "có cod không",
  "thanh toán",
];

const SHIPPING_KEYWORDS = [
  "phí ship",
  "bao lâu nhận hàng",
  "tôi muốn đổi hàng",
  "vận chuyển",
  "giao hàng",
];

const CONTACT_KEYWORDS = [
  "địa chỉ shop ở đâu",
  "số điện thoại hỗ trợ",
  "liên hệ",
];

const FASHION_ADVICE_KEYWORDS = [
  "mặc gì để đi chơi",
  "mix đồ với quần jeans",
  "tư vấn",
];

// Fuse config
const fuseOptions = {
  threshold: 0.8,
  includeScore: true,
};

const fuseOrder = new Fuse(ORDER_KEYWORDS, fuseOptions);
const fuseProduct = new Fuse(PRODUCT_KEYWORDS, fuseOptions);
const fuseSize = new Fuse(SIZE_KEYWORDS, fuseOptions);
const fusePayment = new Fuse(PAYMENT_KEYWORDS, fuseOptions);
const fuseShipping = new Fuse(SHIPPING_KEYWORDS, fuseOptions);
const fuseContact = new Fuse(CONTACT_KEYWORDS, fuseOptions);
const fuseFashion = new Fuse(FASHION_ADVICE_KEYWORDS, fuseOptions);

// ------------------------------------

// Hàm trích xuất loại sản phẩm từ câu hỏi
function extractProductType(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  const productTypes: { [key: string]: string[] } = {
    quần: ["quần", "pants", "trousers", "jeans", "quần dài", "quần short", "quần jean"],
    áo: ["áo", "shirt", "top", "áo sơ mi", "áo thun", "áo phông", "áo khoác", "cardigan"],
    giày: ["giày", "shoes", "sneakers", "boots", "dép", "sandal"],
    "phụ kiện": ["phụ kiện", "accessories", "túi", "bag", "ví", "wallet", "mũ", "hat"],
  };

  for (const [category, keywords] of Object.entries(productTypes)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return category;
      }
    }
  }
  return null;
}

// Hàm trích xuất chiều cao và cân nặng (trả về height tính bằng cm)
function extractHeightWeight(message: string): { height?: number; weight?: number } {
  const result: { height?: number; weight?: number } = {};
  const lower = message.toLowerCase();

  // height: detect explicit cm or m
  // pattern captures number and optional unit
  const heightRegexes = [
    /(\d+(?:[\.,]\d+)?)\s*(cm)\b/i,
    /(\d+(?:[\.,]\d+)?)\s*(m|mét|met)\b/i,
    /chiều cao\s*(?:là\s*)?(\d+(?:[\.,]\d+)?)/i,
    /cao\s*(?:khoảng\s*)?(\d+(?:[\.,]\d+)?)/i,
  ];

  for (const r of heightRegexes) {
    const m = lower.match(r);
    if (m) {
      let v = parseFloat(m[1].replace(",", "."));
      const unit = (m[2] || "").toLowerCase();
      if (unit === "m" || unit === "mét" || unit === "met") {
        v = v * 100; // convert meters to cm
      }
      // if unit cm or no explicit unit, assume number in cm if > 30, else maybe meters -> but we already handled meters
      if (!unit && v < 30) {
        // if number small and no unit, maybe meters like '1.7' -> treat as meters
        v = v * 100;
      }
      result.height = Math.round(v);
      break;
    }
  }

  const weightRegexes = [
    /(\d+(?:[\.,]\d+)?)\s*(kg|kilogram|kí lo|kí-lô)?\b/i,
    /nặng\s*(\d+(?:[\.,]\d+)?)/i,
    /cân nặng\s*(?:là\s*)?(\d+(?:[\.,]\d+)?)/i,
  ];

  for (const r of weightRegexes) {
    const m = lower.match(r);
    if (m) {
      result.weight = parseFloat(m[1].replace(",", "."));
      break;
    }
  }

  return result;
}

// Hàm tính size (dựa trên height cm và weight kg) -> trả về array size
function calculateSize(height?: number, weight?: number): string[] {
  if (!height || !weight) return [];

  const recommendedSizes: string[] = [];

  if (height >= 150 && height <= 160) {
    if (weight < 50) recommendedSizes.push("XS", "S");
    else if (weight <= 60) recommendedSizes.push("S", "M");
    else recommendedSizes.push("M", "L");
  } else if (height > 160 && height <= 170) {
    if (weight < 55) recommendedSizes.push("S", "M");
    else if (weight <= 70) recommendedSizes.push("M", "L");
    else recommendedSizes.push("L", "XL");
  } else if (height > 170 && height <= 180) {
    if (weight < 60) recommendedSizes.push("M", "L");
      else if (weight <= 80) recommendedSizes.push("L", "XL");
      else recommendedSizes.push("XL", "XXL");
    } else if (height > 180) {
    if (weight < 70) recommendedSizes.push("L", "XL");
    else if (weight <= 90) recommendedSizes.push("XL", "XXL");
    else recommendedSizes.push("XXL", "XXXL");
  }

  return recommendedSizes;
}

// helper fuzzy check
const checkFuzzyMatch = (fuseInstance: any, message: string) => {
  try {
    const result = fuseInstance.search(message);
    return result.length > 0 && typeof result[0].score === "number" && result[0].score < 0.4 ? result[0].item : null;
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = (body?.message || "").toString().trim();
    const user = await authCustomer(req);

    if (!message) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi!" }, { status: 400 });
    }

    // 1) Kiểm tra đơn hàng
    const orderMatch = checkFuzzyMatch(fuseOrder, message);
    if (orderMatch) {
      if (!user) {
        return NextResponse.json({ message: "Vui lòng đăng nhập để xem đơn hàng của bạn!" }, { status: 401 });
      }

      const order = await prisma.order.findFirst({
        where: { customer_id: user?.customer_id },
        orderBy: { order_date: "desc" },
        include: {
          OrderItems: {
            include: {
              Product: { include: { Images: true, Brand: true } },
              Size: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ reply: "Bạn chưa có đơn hàng nào." }, { status: 200 });
      }

      const products = order.OrderItems.map((item) => ({
        id: item.Product.product_id,
        name: item.Product.product_name,
        price: Number(item.Product.price),
        image: item.Product.Images[0]?.image_url || "",
        quantity: item.quantity,
        size: item.Size ? item.Size.name_size : "Không rõ",
      }));

      return NextResponse.json(
        {
          reply: `Đơn hàng mới nhất của bạn đang ở trạng thái: ${order.order_state}.`,
          products,
        },
        { status: 200 }
      );
    }

    // 2) Kiểm tra size (dựa trên câu hỏi hoặc dữ liệu height/weight)
    const sizeMatchKeyword = checkFuzzyMatch(fuseSize, message);
    const { height, weight } = extractHeightWeight(message);

    if (sizeMatchKeyword || (height && weight)) {
      const recommendedSizes = calculateSize(height, weight);

      if (recommendedSizes.length > 0) {
        // Tìm các size tương ứng trong DB và lấy sản phẩm có stock > 0
        const allSizes = await prisma.size.findMany({
          where: { name_size: { in: recommendedSizes } },
          include: {
            ProductSizes: {
              include: {
                Product: {
                  include: {
                    Images: { take: 1 },
                    Brand: true,
                  },
                },
              },
            },
          },
        });

        const productMap = new Map<number, any>();
        allSizes.forEach((size) => {
          size.ProductSizes.forEach((ps) => {
            if (Number(ps.stock_quantity) > 0) {
              const productId = ps.Product.product_id;
              if (!productMap.has(productId)) {
                productMap.set(productId, {
                  id: ps.Product.product_id,
                  name: ps.Product.product_name,
                  price: Number(ps.Product.price),
                  image: ps.Product.Images[0]?.image_url || "",
                  brand: ps.Product.Brand?.brand_name || "",
                  availableSizes: [] as string[],
                });
              }
              productMap.get(productId).availableSizes.push(size.name_size);
            }
          });
        });

        const products = Array.from(productMap.values()).slice(0, 8);

        let reply = "";
        if (height && weight) {
          const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
          reply = `Dựa trên thông tin của bạn (cao ${height}cm, nặng ${weight}kg, BMI: ${bmi}), tôi khuyên bạn nên chọn size: ${recommendedSizes.join(", ")}. Dưới đây là các sản phẩm phù hợp:`;
        } else {
          reply = `Tôi khuyên bạn nên chọn size: ${recommendedSizes.join(", ")}. Dưới đây là các sản phẩm phù hợp:`;
        }

        return NextResponse.json({ reply, products, recommendedSizes }, { status: 200 });
      } else if (height || weight) {
        // chỉ cung cấp một trong hai
        return NextResponse.json(
          {
            reply: height
              ? `Bạn đã cung cấp chiều cao ${height}cm. Vui lòng cung cấp cả cân nặng để tư vấn size chính xác (ví dụ: "Tôi cao ${height}cm nặng 65kg").`
              : `Bạn đã cung cấp cân nặng ${weight}kg. Vui lòng cung cấp cả chiều cao để tư vấn size chính xác (ví dụ: "Tôi cao 170cm nặng ${weight}kg").`,
          },
          { status: 200 }
        );
      }
    }

    // 3) Kiểm tra sản phẩm (product keywords or product type)
    const productMatch = checkFuzzyMatch(fuseProduct, message);
    const productType = extractProductType(message);

    if (productMatch || productType) {
      // xây dựng where clause
      let whereClause: any = {};

      if (productType) {
        // tìm category có tên chứa productType
        const categories = await prisma.category.findMany({
  where: {
    category_name: {
      contains: productType,
    },
  },
});


        if (categories.length > 0) {
          whereClause.category_id = { in: categories.map((c) => c.category_id) };
        } else {
          // fallback: tìm theo tên sản phẩm chứa productType
          whereClause.product_name = { contains: productType, mode: "insensitive" };
        }
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        select: {
          product_id: true,
          product_name: true,
          price: true,
          Images: { take: 1 },
          ProductSizes: { select: { size_id: true, stock_quantity: true, Size: true } },
          Brand: { select: { brand_name: true } },
          Category: { select: { category_name: true } },
        },
        take: 8,
      });

      if (products.length === 0) {
        // fallback: lấy một số product khác
        const allProducts = await prisma.product.findMany({
          select: {
            product_id: true,
            product_name: true,
            price: true,
            Images: { take: 1 },
            ProductSizes: { select: { stock_quantity: true, Size: true } },
            Brand: { select: { brand_name: true } },
            Category: { select: { category_name: true } },
          },
          take: 10,
        });

        if (allProducts.length === 0) {
          return NextResponse.json({ reply: "Hiện tại shop không có sản phẩm nào." }, { status: 200 });
        }

        const formattedProducts = allProducts.map((p) => ({
          id: p.product_id,
          name: p.product_name,
          price: p.price,
          image: p.Images[0]?.image_url || "",
          brand: p.Brand?.brand_name || "",
          category: p.Category?.category_name || "",
          stock: p.ProductSizes.reduce((total: number, item: any) => Number(item.stock_quantity) + total, 0),
        }));

        return NextResponse.json(
          {
            reply: productType
              ? `Hiện tại shop có các sản phẩm liên quan đến "${productType}". Dưới đây là một số gợi ý:`
              : "Dưới đây là một số sản phẩm của shop:",
            products: formattedProducts,
          },
          { status: 200 }
        );
      }

      const formattedProducts = products.map((p) => ({
        id: p.product_id,
        name: p.product_name,
        price: p.price,
        image: p.Images[0]?.image_url || "",
        brand: p.Brand?.brand_name || "",
        category: p.Category?.category_name || "",
        stock: p.ProductSizes.reduce((total: number, item: any) => Number(item.stock_quantity) + total, 0),
      }));

      return NextResponse.json(
        {
          reply: productType ? `Dưới đây là các sản phẩm ${productType} của shop:` : "Dưới đây là một số sản phẩm của shop:",
          products: formattedProducts,
        },
        { status: 200 }
      );
    }

    // 4) Các câu hỏi nhỏ khác (thanh toán, vận chuyển, liên hệ, tư vấn thời trang)
    let contextIntro =
      "Xin chào! Tôi là trợ lý AI hỗ trợ khách hàng chuyên về thời trang và quần áo. Tôi có thể giúp bạn:\n" +
      "- Tư vấn chọn size dựa trên chiều cao và cân nặng\n" +
      "- Tìm kiếm sản phẩm phù hợp\n" +
      "- Hỗ trợ về đơn hàng, thanh toán, vận chuyển\n" +
      "- Tư vấn về thời trang và cách phối đồ\n" +
      "- Trả lời các câu hỏi về shop và sản phẩm\n\n";

    if (checkFuzzyMatch(fusePayment, message)) {
      contextIntro +=
        "Thông tin thanh toán:\n- Chúng tôi hỗ trợ COD, chuyển khoản, thẻ và ví điện tử.\n- Hiện tại chưa hỗ trợ trả góp.\n";
      return NextResponse.json({ reply: contextIntro }, { status: 200 });
    } else if (checkFuzzyMatch(fuseShipping, message)) {
      contextIntro +=
        "Thông tin vận chuyển:\n- Phí ship tùy khu vực (thường 20.000 - 50.000đ)\n- Thời gian giao: 2-5 ngày làm việc\n- Hỗ trợ đổi hàng trong vòng 7 ngày nếu có lỗi.\n";
      return NextResponse.json({ reply: contextIntro }, { status: 200 });
    } else if (checkFuzzyMatch(fuseContact, message)) {
      contextIntro +=
        "Thông tin liên hệ:\n- Hotline: 1900-xxxx\n- Email: support@shopaoquan.com\n- Fanpage: Facebook.com/ShopAoQuan\n";
      return NextResponse.json({ reply: contextIntro }, { status: 200 });
    } else if (checkFuzzyMatch(fuseFashion, message)) {
      contextIntro += "Mình sẽ tư vấn cách phối đồ, mùa này hợp mốt những item cơ bản như ... (gợi ý chung).";
      // You could add more detailed fashion advice here
      return NextResponse.json({ reply: contextIntro }, { status: 200 });
    }

    // 5) Nếu không phải trường hợp trên -> gửi tới Google Gemini để trả lời dạng tự nhiên
    const [allCategories, sampleProducts] = await Promise.all([
      prisma.category.findMany({ select: { category_name: true }, take: 10 }),
      prisma.product.findMany({
        select: { product_name: true, Category: { select: { category_name: true } } },
        take: 5,
      }),
    ]);

    const categoryList = allCategories.map((c) => c.category_name).join(", ");
    const productList = sampleProducts.map((p) => `${p.product_name} (${p.Category?.category_name || "N/A"})`).join(", ");

    let context = `Xin chào! Tôi là trợ lý hỗ trợ khách hàng về thời trang.\nDanh mục shop: ${categoryList}\nMột số sản phẩm: ${productList}\n\nHãy trả lời câu hỏi khách hàng một cách thân thiện và ngắn gọn.`;

    // Call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [
        { role: "model", parts: [{ text: context }] },
        { role: "user", parts: [{ text: message }] },
      ],
    });

    const replyParts = result?.response?.candidates?.[0]?.content?.parts;
    let messageText = "";

    if (Array.isArray(replyParts) && replyParts.length > 0) {
      // Gemini trả về mảng parts, mỗi phần có .text (hoặc .content)
      messageText = replyParts.map((p: any) => p.text || p?.content || "").join("\n").trim();
    } else if (typeof replyParts === "string") {
      messageText = replyParts;
    } else {
      messageText = "Xin lỗi, tôi không trả lời được ngay. Vui lòng thử câu khác (ví dụ: hỏi về sản phẩm, size, đơn hàng).";
    }

    return NextResponse.json({ result: [{ text: messageText }] }, { status: 200 });
  } catch (error) {
    console.error("Lỗi chatbot:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xử lý yêu cầu." }, { status: 500 });
  }
}