import React from 'react';
import './Layout.css';

interface LayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, main }) => {
  return (
    <div className="layout">
      <aside className="layout-sidebar">
        {sidebar}
      </aside>
      <main className="layout-main">
        {main}
      </main>
    </div>
  );
};