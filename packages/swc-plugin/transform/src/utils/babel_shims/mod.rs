use swc_ecma_ast::{ArrowExpr, Function};

pub enum Fn {
    Function(Function),
    ArrowFunction(ArrowExpr),
}
