#[allow(clippy::all)]
use std::borrow::Borrow;
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use swc_ecma_ast::{BlockStmt, BlockStmtOrExpr, Stmt};

use crate::models::component_segment::ComponentSegment;
use crate::utils::babel_shims::GenericFn;

#[derive(Debug)]
pub struct Component {
    pub name: String,
    pub is_hook: bool,
    pub function: Rc<RefCell<GenericFn>>,
    segments: HashMap<Stmt, ComponentSegment>,
}

impl Component {
    pub fn new(name: String, is_hook: bool, function: Rc<RefCell<GenericFn>>) -> Self {
        function.borrow_mut().ensure_body_block_stmt();
        println!("Creating component: {}", name);

        Self {
            name,
            is_hook,
            function,
            segments: Default::default(),
        }
    }

    pub fn add_segment(&mut self, stmt: Stmt, segment: ComponentSegment) {
        self.segments.insert(stmt, segment);
    }

    pub fn get_segments(&self) -> &HashMap<Stmt, ComponentSegment> {
        self.segments.borrow()
    }

    pub fn get_name(&self) -> &str {
        &self.name
    }

    pub fn prepare(&self) {}

    fn get_body_block_stmt(&self) -> BlockStmt {
        let body = self.function.as_ref().borrow().get_body();

        match body {
            Some(body) => match body {
                BlockStmtOrExpr::BlockStmt(block_stmt) => block_stmt,
                BlockStmtOrExpr::Expr(_) => panic!("Expected block statement"),
            },
            None => panic!("Function has no body"),
        }
    }
}
