import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import styles from "@/app/information-design.module.css";

export function PublicPageShell({ children }: { children: ReactNode }) {
  return <main id="main-content" tabIndex={-1} className={styles.page}><div className={styles.container}>
    <header className={styles.header}><Link href="/" className={styles.brand} aria-label="Withly home"><Image src="/withly-app-icon.svg" alt="" width={38} height={38} />Withly</Link><nav aria-label="Page navigation"><Link href="/">Home</Link><Link href="/#join">Sign in <ArrowUpRight size={14} /></Link></nav></header>
    {children}
    <SiteFooter />
  </div></main>;
}
