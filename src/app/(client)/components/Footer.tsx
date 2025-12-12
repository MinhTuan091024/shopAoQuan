import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between py-10   bg-black/80 text-gray-300  border-t-4 container mx-auto">
        {/* footer 1 */}
        <div className="md:h-52 h-full  w-full md:w-1/3 mb-6 md:mb-0  flex flex-col ">
          <h1 className="text-xl font-bold mb-4 text-center md:text-left">
            VỀ CHÚNG TÔI
          </h1>
          <p className="text-sm leading-relaxed  flex-grow ps-3 text-left">
            ODIN CLUB luôn lựa chọn những loại vải cao cấp nhất cho các sản phẩm
            của mình.
            <br />
            <span>
              Mỗi một thiết kế đều là sản phẩm được sản xuất tỉ mỉ và chất
              lượng.
            </span>
          </p>
        </div>

        {/* footer 2 */}
        <div className="md:h-52 h-full  w-full md:w-1/3 mb-6 md:mb-0  ">
          <div className="flex justify-center">
            <h1 className="text-xl font-bold mb-4 md:text-left text-center">
              THÔNG TIN LIÊN HỆ
            </h1>
          </div>
          <div className="text-center">
            <p className="text-sm ">CSKH: 0357.804.535</p>
            <p className="text-sm ">Mua hàng: 0357.804.535</p>
            <p className="text-sm  mb-4">Email: info.odinclub@gmail.com</p>
          </div>
          <div className="flex justify-center">
            <Link href={"/hethongcuahang"}>
              <button className="py-2 px-16 bg-red-800 hover:bg-red-950 rounded text-white">
                Hệ Thống Cửa Hàng
              </button>
            </Link>
          </div>
        </div>

        {/* footer 3 */}
        <div className="md:h-52 h-full  w-full md:w-1/3 mb-6 md:mb-0  flex flex-col ">
          <p className="text-center md:text-left text-3xl font-semibold italic mb-4">
            𝓢𝓱𝓸𝓹
          </p>
          
        </div>
      </div>
      <div className="border-t-2 border-black  dark:border-white p-3 h-12 cursor-pointer text-center">
        <Link
          className="text-center "
          href={""}
        >
          Thiết Kế WebSite Bởi{" "}
          <span className="text-2xl mt-[1px]">©Hoàng Minh Tuấn</span>
        </Link>
      </div>
    </>
  );
};

export default Footer;
