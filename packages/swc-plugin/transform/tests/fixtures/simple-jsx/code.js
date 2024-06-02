function TestComponent1() {
  function innerFn() {
    return 2;
  }

  if (loading) {
    return null;
  }

  return <div>Hello World</div>;
}

const TestComponent2 = (props) => {
  if (loading) {
    return null;
  }

  return <div>Test Component</div>;
};

const TestComponent3 = (props) => <div>Hi</div>;

const TestComponent4 = function (props) {
  return <div>Hi</div>;
};

const useTest1 = () => {
  const [state, setState] = useState(0);
  return state;
};

function useTest2() {
  const [state, setState] = useState(0);
  return state;
}

function nonComponent() {
  return <div>Another Function</div>;
}

function nonComponent2() {
  return;
}

function nonComponent3() {
  return 10;
}

function nonComponent4() {}

const nonComponent5 = () => {};

const nonComponent6 = () => 10;

const nonComponent7 = () => {
  return;
};
