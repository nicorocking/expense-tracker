import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (!user) return null;

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-content">
          <h1>💰 Gestor de Gastos</h1>
          <div>
            <span style={{ marginRight: '15px', color: '#666' }}>
              {user.name}
            </span>
            <button onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="bottom-nav">
        <a
          href="/dashboard"
          className={`bottom-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Inicio</span>
        </a>

        <a
          href="/expenses"
          className={`bottom-nav-item ${location.pathname === '/expenses' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            navigate('/expenses');
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Gastos</span>
        </a>

        <a
          href="/add-expense"
          className={`bottom-nav-item ${location.pathname === '/add-expense' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            navigate('/add-expense');
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Agregar</span>
        </a>

        <a
          href="/reports"
          className={`bottom-nav-item ${location.pathname === '/reports' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            navigate('/reports');
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Reportes</span>
        </a>
      </div>
    </>
  );
}

export default Navbar;
