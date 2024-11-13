import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { NavigationBar } from './components/NavigationBar';
import { BattletronicsGameScreen } from './screens/BattletronicsGameScreen';
import { VideoChatScreen } from './screens/VideoChatScreen';

export const App = () => {
  return (
    <div className="App" style={{ height: '100%', margin: '0' }}>
      <BrowserRouter>
        <NavigationBar />
        <Routes>
          <Route path="/" element={<VideoChatScreen />} />
          <Route path="/game" element={<BattletronicsGameScreen />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};
