export const getBoardSize = () => {
  return Math.min(Math.floor(window.innerWidth), Math.floor(window.innerHeight - 160));
};
