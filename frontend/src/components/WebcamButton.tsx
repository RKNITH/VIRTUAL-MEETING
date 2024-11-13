import styled from 'styled-components';

const Button = styled.button`
  background: #7fa650;
  font-size: 2.2rem;
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  width: 200px;
  border: none;
`;

export const WebcamButton = (props: { onClick: () => void }) => {
  return (
    <Button id="webcamButton" onClick={props.onClick}>
      Start webcam
    </Button>
  );
};
