import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#11140f",
          color: "#f7f8f4",
          display: "flex",
          fontSize: 132,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: -6,
          width: "100%",
        }}
      >
        PC
      </div>
    ),
    size,
  );
}
