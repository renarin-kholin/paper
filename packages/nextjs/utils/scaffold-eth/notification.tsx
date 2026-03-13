import React from "react";
import { Toast, ToastPosition, toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/20/solid";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

type NotificationProps = {
  content: React.ReactNode;
  status: "success" | "info" | "loading" | "error" | "warning";
  duration?: number;
  icon?: React.ReactNode;
  position?: ToastPosition;
};

type NotificationOptions = {
  duration?: number;
  icon?: React.ReactNode;
  position?: ToastPosition;
};

const ENUM_STATUSES = {
  success: <CheckCircleIcon className="h-6 w-6 text-emerald-600" />,
  loading: <span className="h-5 w-5 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />,
  error: <ExclamationCircleIcon className="h-6 w-6 text-rose-600" />,
  info: <InformationCircleIcon className="h-6 w-6 text-sky-600" />,
  warning: <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />,
};

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = "top-center";

/**
 * Custom Notification
 */
const Notification = ({
  content,
  status,
  duration = DEFAULT_DURATION,
  icon,
  position = DEFAULT_POSITION,
}: NotificationProps) => {
  const isTop = position.startsWith("top");

  return toast.custom(
    (t: Toast) => (
      <div
        className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.28)] transform-gpu transition-all duration-200 ${
          t.visible ? "translate-y-0 opacity-100" : isTop ? "-translate-y-2 opacity-0" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="mt-0.5 shrink-0 leading-none">{icon ?? ENUM_STATUSES[status]}</div>

        <div className="min-w-0 flex-1 overflow-x-hidden break-words text-sm leading-relaxed text-stone-700 whitespace-pre-line">
          {content}
        </div>

        <button
          type="button"
          className="-mr-1 -mt-1 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          onClick={() => toast.remove(t.id)}
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    ),
    {
      duration: status === "loading" ? Infinity : duration,
      position,
    },
  );
};

export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "success", ...options });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "info", ...options });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "warning", ...options });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "error", ...options });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "loading", ...options });
  },
  remove: (toastId: string) => {
    toast.remove(toastId);
  },
};
