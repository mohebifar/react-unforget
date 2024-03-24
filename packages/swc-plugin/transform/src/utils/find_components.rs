use std::{cell::RefCell, rc::Rc};

use swc_common::pass::Either;
use swc_ecma_ast::{BlockStmt, Expr, Function};
use swc_ecma_visit::{as_folder, noop_visit_mut_type, Fold, VisitMut, VisitMutWith};

use crate::{Config, State};

use super::ast_tools::generic::find_body;

struct ComponentFinderState {
    return_type_mathces_component: bool,
    return_count: u32,
}

impl Default for ComponentFinderState {
    fn default() -> Self {
        Self {
            return_type_mathces_component: true,
            return_count: 0,
        }
    }
}

impl ComponentFinderState {
    fn does_return_type_match_component(&self) -> bool {
        self.return_type_mathces_component && self.return_count > 0
    }
}

struct ComponentFinder {
    config: Rc<Config>,
    state: Rc<RefCell<State>>,
}

impl ComponentFinder {
    pub fn new(config: Rc<Config>, state: Rc<RefCell<State>>) -> Self {
        Self { config, state }
    }
}

impl VisitMut for ComponentFinder {
    noop_visit_mut_type!();

    fn visit_mut_fn_decl(&mut self, fn_decl: &mut swc_ecma_ast::FnDecl) {
        if matches_component_name(&fn_decl.ident.sym.to_string()) {
            let mut return_visitor: VisitReturnStatements = VisitReturnStatements {
                state: Default::default(),
            };

            fn_decl
                .function
                .body
                .visit_mut_children_with(&mut return_visitor);

            if return_visitor.state.does_return_type_match_component() {
                println!("Found component: {:?}", fn_decl.ident.sym);
            }
        }

        if matches_hook_name(&fn_decl.ident.sym.to_string()) {
            println!("Found hook: {:?}", fn_decl.ident.sym);
        }
    }

    fn visit_mut_var_decl(&mut self, n: &mut swc_ecma_ast::VarDecl) {
        for decl in &mut n.decls {
            if let swc_ecma_ast::Pat::Ident(ref id) = decl.name {
                if matches_component_name(&id.sym.to_string()) {
                    if let Some(ref mut init) = decl.init {
                        let fn_body = find_body(init);

                        let mut visitor: VisitReturnStatements = Default::default();

                        if let Some(fn_body) = fn_body {
                            let block_stmt = match fn_body {
                                Either::Left(block_stmt) => block_stmt,
                                Either::Right(_) => {
                                    todo!("Arrow functions with inline returns not supported yet")
                                }
                            };

                            block_stmt.visit_mut_children_with(&mut visitor);

                            if visitor.state.does_return_type_match_component() {
                                println!("Found component: {:?}", id.sym);
                            }
                        }
                    }
                }

                if matches_hook_name(&id.sym.to_string()) {
                    println!("Found hook: {:?}", id.sym);
                }
            }
        }
    }
}

struct VisitReturnStatements {
    state: ComponentFinderState,
}

impl Default for VisitReturnStatements {
    fn default() -> Self {
        Self {
            state: Default::default(),
        }
    }
}

impl VisitMut for VisitReturnStatements {
    noop_visit_mut_type!();
    fn visit_mut_fn_decl(&mut self, _: &mut swc_ecma_ast::FnDecl) {}

    fn visit_mut_function(&mut self, _: &mut Function) {}

    fn visit_mut_arrow_expr(&mut self, _: &mut swc_ecma_ast::ArrowExpr) {}

    fn visit_mut_return_stmt(&mut self, n: &mut swc_ecma_ast::ReturnStmt) {
        let arg = n.arg.as_mut().unwrap();
        self.state.return_count += 1;
        if !is_component_return_type(arg) {
            self.state.return_type_mathces_component = false;
        }
    }
}

/**
 * Check if the given expression qualifies as a component return type.
 */
fn is_component_return_type(node: &mut Expr) -> bool {
    if let Expr::JSXElement(_) = node {
        return true;
    }

    if let Expr::JSXFragment(_) = node {
        return true;
    }

    if let Expr::Lit(literal) = node {
        if let swc_ecma_ast::Lit::Null(_) = literal {
            return true;
        }
    }

    false
}

pub fn component_finder(config: Rc<Config>, state: Rc<RefCell<State>>) -> impl VisitMut + Fold {
    as_folder(ComponentFinder::new(config, state))
}

fn matches_component_name(name: &str) -> bool {
    name.chars().next().unwrap().is_uppercase()
        | (name.chars().next().unwrap() == '_' && name.chars().nth(1).unwrap().is_uppercase())
}

fn matches_hook_name(name: &str) -> bool {
    name.starts_with("use")
}
