import { Logo } from "@components/Logo";
import { Analytics } from "@vercel/analytics/react";
import { useConfig } from "nextra-theme-docs";

export default {
  logo: <Logo />,
  docsRepositoryBase:
    "https://github.com/mohebifar/react-unforget/tree/main/apps/docs",
  project: {
    link: "https://github.com/mohebifar/react-unforget",
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s – React Unforget",
    };
  },
  footer: {
    text: `MIT ${new Date().getFullYear()} © React Unforget`,
  },

  head() {
    const { frontMatter } = useConfig();
    const title = frontMatter?.title || "Optimize your React applications";
    const description =
      frontMatter?.description ||
      "React Unforget automatically optimizes your React applications";

    const composedTitle = `${title} – React Unforget`;

    return (
      <>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`/favicons/apple-touch-icon.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={`/favicons/favicon-32x32.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={`/favicons/favicon-16x16.png`}
        />
        <meta name="theme-color" content="#ffffff" />
        <meta name="msapplication-TileColor" content="#00a300" />
        <link rel="manifest" href={`/favicons/site.webmanifest`} />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="title" content={composedTitle} />
        <meta name="description" content={description} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@mohebifar" />

        <meta property="og:description" content={description} />
        <meta property="og:title" content={composedTitle} />
        <meta property="og:type" content="website" />
        <meta
          name="apple-mobile-web-app-title"
          content="React Unforget Documentation"
        />
      </>
    );
  },

  darkMode: false,
  nextThemes: {
    defaultTheme: "dark",
    forcedTheme: "dark",
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    titleComponent: ({ title, type }) =>
      type === "separator" ? (
        <div className="flex items-center gap-2">
          {title}
          <Analytics />
        </div>
      ) : (
        <>
          {title}
          <Analytics />
        </>
      ),
  },

  gitTimestamp: ({ timestamp }) => (
    <>Last updated on {timestamp.toLocaleDateString()}</>
  ),
};
