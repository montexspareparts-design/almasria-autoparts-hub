interface OilsBrandMarkProps {
  className?: string;
  showName?: boolean;
}

const OilsBrandMark = ({ className = "", showName = false }: OilsBrandMarkProps) => (
  <div className={`oils-brand-lockup ${className}`} aria-label="المصرية للزيوت">
    <svg className="oils-brand-emblem" viewBox="0 0 96 96" role="img" aria-hidden="true">
      <path className="oils-emblem-frame" d="M48 3 86 19a12 12 0 0 1 7 11v36a12 12 0 0 1-7 11L48 93 10 77a12 12 0 0 1-7-11V30a12 12 0 0 1 7-11L48 3Z" />
      <path className="oils-emblem-core" d="M48 9 81 23a9 9 0 0 1 5 8v34a9 9 0 0 1-5 8L48 87 15 73a9 9 0 0 1-5-8V31a9 9 0 0 1 5-8L48 9Z" />
      <path className="oils-emblem-road" d="M18 57c14-2 23-8 31-20 7-10 13-13 26-14-10 5-15 11-20 20-7 12-17 20-37 20Z" />
      <path className="oils-emblem-redline" d="M21 68c18 0 31-5 41-15 6-6 11-9 19-10-7 5-11 10-17 16-10 10-23 15-43 15Z" />
      <path className="oils-emblem-drop" d="M51 22c0 0-12 14-12 23a12 12 0 0 0 24 0c0-9-12-23-12-23Zm-5 25c0 4 3 7 7 7" />
    </svg>
    {showName && (
      <div className="oils-brand-wordmark">
        <strong>المصرية</strong>
        <span>للزيوت</span>
      </div>
    )}
  </div>
);

export default OilsBrandMark;