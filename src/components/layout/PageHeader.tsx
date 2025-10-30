import React from "react";

interface PageHeaderProps {
  title: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  return (
    <div className="relative w-full mt-0 mb-6 flex items-center justify-center">
      {/* Überschrift zentriert absolut in der Mitte */}
      <h1 className="text-3xl font-bold tracking-tight text-center">
        {title}
      </h1>

      {/* Logo fixiert rechts, ohne Layout zu verschieben */}
      <img
        src="/djk_logo.png"
        alt="DJK Logo"
        className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 object-contain mr-2"
      />
    </div>
  );
};

export default PageHeader;
