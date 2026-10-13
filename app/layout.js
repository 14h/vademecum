import "./globals.css";

export const metadata = {
  title: "Vademecum Index",
  description: "An A–Z browser for the collected Vademecum medical search data.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
