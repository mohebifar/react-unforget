use std::ops::Deref;

use swc_common::DUMMY_SP;
use swc_ecma_ast::{ArrowExpr, BlockStmt, BlockStmtOrExpr, Function};
use swc_ecma_utils::ExprFactory;
use swc_ecma_visit::VisitWith;

use super::ast_tools::returns_like_component::{is_component_return_type, VisitReturnStatements};

#[derive(Debug, Clone)]
pub enum GenericFn {
    Function(Box<Function>),
    ArrowFunction(Box<ArrowExpr>),
}

impl GenericFn {
    pub fn get_body(&self) -> Option<BlockStmtOrExpr> {
        match self {
            GenericFn::Function(f) => {
                let body = &f.body;
                body.as_ref()
                    .map(|body| BlockStmtOrExpr::BlockStmt(body.clone()))
            }
            GenericFn::ArrowFunction(f) => Some(f.body.deref().clone()),
        }
    }

    pub fn update_body(&mut self, body: BlockStmt) {
        match self {
            GenericFn::Function(f) => {
                f.body = Some(body);
            }
            GenericFn::ArrowFunction(f) => {
                f.body = Box::new(body.into());
            }
        }
    }

    pub fn ensure_body_block_stmt(&mut self) {
        if let GenericFn::ArrowFunction(arrow_function) = self {
            let body = arrow_function.body.deref();
            if let BlockStmtOrExpr::Expr(expr) = body {
                let return_arg = expr.clone().into_return_stmt();
                let block_stmt = BlockStmt {
                    span: DUMMY_SP,
                    stmts: vec![return_arg.into()],
                };

                self.update_body(block_stmt);
            }
        }
    }

    pub fn return_type_matches_component(&self) -> bool {
        let fn_body = self.get_body();

        if let Some(fn_body) = fn_body {
            match fn_body {
                BlockStmtOrExpr::BlockStmt(ref block_stmt) => {
                    let mut visitor: VisitReturnStatements = Default::default();
                    block_stmt.visit_children_with(&mut visitor);
                    visitor.state.does_return_type_match_component()
                }
                BlockStmtOrExpr::Expr(ref expr) => is_component_return_type(expr.deref()),
            }
        } else {
            false
        }
    }
}
