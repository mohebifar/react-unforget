use swc_common::pass::Either;
use swc_ecma_ast::{BlockStmt, BlockStmtOrExpr, Expr, Pat};

pub fn find_params(callee: &mut Expr) -> Option<Vec<&mut Pat>> {
    match callee {
        Expr::Arrow(callee) => Some(callee.params.iter_mut().collect()),
        Expr::Fn(callee) => Some(
            callee
                .function
                .params
                .iter_mut()
                .map(|param| &mut param.pat)
                .collect(),
        ),
        _ => None,
    }
}

pub fn find_body(callee: &mut Expr) -> Option<Either<&mut BlockStmt, &mut Expr>> {
    match callee {
        Expr::Arrow(e) => match &mut *e.body {
            BlockStmtOrExpr::BlockStmt(b) => Some(Either::Left(b)),
            BlockStmtOrExpr::Expr(b) => Some(Either::Right(&mut **b)),
        },
        Expr::Fn(e) => Some(Either::Left(e.function.body.as_mut().unwrap())),
        _ => None,
    }
}
