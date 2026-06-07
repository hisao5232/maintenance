// Footer.tsx
import styles from "./Footer.module.css"

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <a href="https://go-pro-world.net" target="_blank" rel="noopener noreferrer">
            go-pro-world.net
          </a>
          {" "}— Since 2025
        </div>
        <div className={styles.right}>
          HEAVY EQUIPMENT SERVICE LOG v1.0
        </div>
      </div>
    </footer>
  )
}
