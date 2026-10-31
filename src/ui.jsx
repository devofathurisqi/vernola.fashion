import React, { useEffect, useRef } from "react";
import { X, ArrowUpRight, ImageOff, Check, LoaderCircle } from "lucide-react";
import { safeImage } from "./lib";
import {imageSource} from './media';
export function Picture({
  src,
  alt = "",
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw",
  ...props
}) {
  const safe = safeImage(src),
    entry = imageSource(safe);
  return safe ? (
    <img
      {...props}
      className={className}
      src={entry?.src || safe}
      srcSet={entry?.srcset}
      sizes={entry ? sizes : undefined}
      alt={alt}
      width={entry?.width || 800}
      height={entry?.height || 1000}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
        e.currentTarget.parentElement.classList.add("image-missing");
      }}
    />
  ) : (
    <div className={`placeholder ${className}`}>
      <ImageOff size={24} />
      <span>Foto segera hadir</span>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  className = "",
}) {
  const ref = useRef();
  useEffect(() => {
    ref.current.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      ref.current?.close();
      document.body.style.overflow = document.querySelector("dialog[open]")
        ? "hidden"
        : "";
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""} ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button className="icon close" aria-label="Tutup" onClick={onClose}>
        <X size={20} />
      </button>
      {children}
    </dialog>
  );
}
export function Empty({ icon: Icon = ImageOff, title, text, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={30} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
export function Button({ children, busy = false, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`btn ${className}`}
      disabled={busy || props.disabled}
    >
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Toast({ message, clear }) {
  useEffect(() => {
    if (message) {
      const t = setTimeout(clear, 6500);
      return () => clearTimeout(t);
    }
  }, [message]);
  return message ? (
    <div className="toast" role="status">
      <Check size={18} />
      <span>{message}</span>
      <button className="icon" aria-label="Tutup pemberitahuan" onClick={clear}>
        <X size={16} />
      </button>
    </div>
  ) : null;
}
