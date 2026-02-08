import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpense from './components/AddExpense';
import Reports from './components/Reports';
import Navbar from './components/Navbar';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <Router>
      <Navbar user={user} setUser={setUser} />
      
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" /> : <Register setUser={setUser} />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/expenses"
          element={user ? <ExpenseList /> : <Navigate to="/login" />}
        />
        <Route
          path="/add-expense"
          element={user ? <AddExpense /> : <Navigate to="/login" />}
        />
        <Route
          path="/reports"
          element={user ? <Reports /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
