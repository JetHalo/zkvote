import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const NotFound = () => {
  const router = useRouter();
  const { language } = useI18n();
  const copy = language === "zh"
    ? { message: "页面不存在", backHome: "返回首页" }
    : { message: "Page not found", backHome: "Back to home" };

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", router.asPath);
  }, [router.asPath]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="scene-background" />
      <div className="ambient-glow" style={{ width: '500px', height: '500px', top: '30%', left: '35%', background: 'radial-gradient(circle, hsl(224 60% 15% / 0.15), transparent 65%)', filter: 'blur(100px)' }} />
      <div className="text-center relative z-10 space-y-5">
        <h1 className="text-[4.5rem] font-extrabold text-gradient tracking-[-0.04em]">404</h1>
        <p className="text-[15px] text-muted-foreground/45">{copy.message}</p>
        <Link href="/" className="inline-block btn-primary px-6 py-3 text-[13px] mt-2">{copy.backHome}</Link>
      </div>
    </div>
  );
};

export default NotFound;
