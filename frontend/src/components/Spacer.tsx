import styled from 'styled-components';

export const Spacer = styled.div<{ width?: number; height?: number }>`
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  height: ${(props) => props.height || 1}px;
  width: ${(props) => props.width || 1}px;
`;
