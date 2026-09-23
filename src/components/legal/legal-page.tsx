import Link from "next/link";

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}

export function LegalPage({ title, description, updatedAt, sections }: LegalPageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          返回登录
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-normal text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">更新日期：{updatedAt}</p>
      </div>

      <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
