use swc_ecma_ast::{ArrowExpr, Expr, FnDecl, Function, Lit, ReturnStmt};
use swc_ecma_utils::ExprExt;
use swc_ecma_visit::{noop_visit_type, Visit};

pub struct ReturnTypeVisitorState {
    return_type_mathces_component: bool,
    return_count: u32,
}

impl Default for ReturnTypeVisitorState {
    fn default() -> Self {
        Self {
            return_type_mathces_component: true,
            return_count: 0,
        }
    }
}

impl ReturnTypeVisitorState {
    pub fn does_return_type_match_component(&self) -> bool {
        self.return_type_mathces_component && self.return_count > 0
    }
}

#[derive(Default)]
pub struct VisitReturnStatements {
    pub state: ReturnTypeVisitorState,
}

impl Visit for VisitReturnStatements {
    noop_visit_type!();

    // We don't want to visit nested functions
    fn visit_fn_decl(&mut self, _: &FnDecl) {}
    fn visit_function(&mut self, _: &Function) {}
    fn visit_arrow_expr(&mut self, _: &ArrowExpr) {}

    fn visit_return_stmt(&mut self, n: &ReturnStmt) {
        self.state.return_count += 1;

        if let Some(arg) = &n.arg {
            if !is_component_return_type(arg.as_expr()) {
                self.state.return_type_mathces_component = false;
            }
        }
    }
}

/**
 * Check if the given expression qualifies as a component return type.
 */
pub fn is_component_return_type(node: &Expr) -> bool {
    if let Expr::JSXElement(_) = node {
        return true;
    }

    if let Expr::JSXFragment(_) = node {
        return true;
    }

    if let Expr::Lit(literal) = node {
        return matches!(literal, Lit::Null(_));
    }

    false
}
