import { Moon, Sun } from 'lucide-react';
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

const Header = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white">AdDash</h1>
      
      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleDarkMode}
        className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Toggle Dark Mode"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>
  );
};

export default Header;