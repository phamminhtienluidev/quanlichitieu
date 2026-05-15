import styles from "./Header.module.css";

interface HeaderProps {
  title?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  variant?: "default" | "back";
}

export default function Header({
  title = "Quản lí tài chính",
  leftIcon,
  rightIcon,
  onLeftClick,
  onRightClick,
  variant = "default",
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {leftIcon && (
          <button className={styles.iconBtn} onClick={onLeftClick}>
            <span className="material-symbols-outlined">{leftIcon}</span>
          </button>
        )}
        <div className={styles.logo}>
          <h1 className={styles.title}>{title}</h1>
        </div>
      </div>

    </header>
  );
}
