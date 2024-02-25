const varDefinedOutside = 1;
const generateValue = () => 2;

function MyComponent({ someProp }) {
  const [state, setState] = useState(0);

  const handleIncrement = () => {
    setState(state + 1);
    console.log("current state", state);
  };

  const myDerivedVariable = state + 1;

  const propDerivedVariable = someProp + "_" + someProp;

  const someGeneratedValue = generateValue();

  const unusedVariable = 1;
  const valueDerivedFromDefinedOutside = varDefinedOutside * 10;

  return (
    <button onClick={handleIncrement}>
      Test {myDerivedVariable} {propDerivedVariable} {varDefinedOutside}{" "}
      {valueDerivedFromDefinedOutside} {someGeneratedValue}
    </button>
  );
}

export { MyComponent };
