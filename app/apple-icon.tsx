import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#11140f",
          borderRadius: 40,
          color: "#f7f8f4",
          display: "flex",
          fontSize: 48,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        PC
      </div>
    ),
    size,
  );
}
