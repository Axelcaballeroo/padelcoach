import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f7f8f4",
          color: "#10120f",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: 72,
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 18,
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#11140f",
              borderRadius: 24,
              color: "#f7f8f4",
              display: "flex",
              height: 72,
              justifyContent: "center",
              width: 72,
            }}
          >
            PC
          </div>
          PadelCoach
        </div>
        <div>
          <div style={{ fontSize: 82, fontWeight: 800, lineHeight: 1.02 }}>
            Gestiona tu cancha como una app profesional.
          </div>
          <div
            style={{
              color: "#62685e",
              fontSize: 34,
              lineHeight: 1.35,
              marginTop: 28,
              maxWidth: 880,
            }}
          >
            Agenda, alumnos, abonos y pagos para profesores de padel.
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
