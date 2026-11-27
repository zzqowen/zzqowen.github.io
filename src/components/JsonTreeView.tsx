import { ChevronDown, ChevronRight } from 'lucide-react'
import { buildJsonPath } from '../tools/json/jsonPath'
import './JsonTree.css'

export type JsonDiffKind = 'added' | 'removed' | 'changed'

interface JsonTreeViewProps {
  value: unknown
  collapsedPaths: ReadonlySet<string>
  onToggle: (path: string) => void
  highlights?: ReadonlyMap<string, JsonDiffKind>
}

interface TreeNodeProps extends JsonTreeViewProps {
  name?: string | number
  path: string
  depth: number
  isLast: boolean
  inheritedDiff?: JsonDiffKind
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null) return <span className="json-tree-value" data-type="null">null</span>
  if (typeof value === 'string') return <span className="json-tree-value" data-type="string">{JSON.stringify(value)}</span>
  if (typeof value === 'number') return <span className="json-tree-value" data-type="number">{String(value)}</span>
  if (typeof value === 'boolean') return <span className="json-tree-value" data-type="boolean">{String(value)}</span>
  return <span className="json-tree-value" data-type="null">{String(value)}</span>
}

function TreeNode({
  name,
  value,
  path,
  depth,
  isLast,
  collapsedPaths,
  onToggle,
  highlights,
  inheritedDiff,
}: TreeNodeProps) {
  const isContainer = typeof value === 'object' && value !== null
  const isArray = Array.isArray(value)
  const children: Array<[string | number, unknown]> = isArray
    ? (value as unknown[]).map((item, index) => [index, item])
    : isContainer
      ? Object.entries(value as Record<string, unknown>)
      : []

  const isEmpty = isContainer && children.length === 0
  const isCollapsed = isContainer && !isEmpty && collapsedPaths.has(path)
  const ownDiff = highlights?.get(path)
  const diff = ownDiff ?? inheritedDiff
  const childDiff = diff === 'added' || diff === 'removed' ? diff : undefined
  const indent = { paddingLeft: `${depth * 14}px` }

  return (
    <div className="json-tree-node" data-diff={diff}>
      <div className="json-tree-row" style={indent} data-diff={diff}>
        {isContainer && !isEmpty ? (
          <button
            className="json-tree-toggle"
            type="button"
            onClick={() => onToggle(path)}
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? '展开' : '收起'} ${path}`}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span className="json-tree-toggle-space" />
        )}

        {name !== undefined && (
          <>
            <span className="json-tree-key">{typeof name === 'number' ? name : JSON.stringify(name)}</span>
            <span className="json-tree-colon">:</span>
          </>
        )}

        {isContainer ? (
          <span className="json-tree-bracket">
            {isArray ? '[' : '{'}
            {isCollapsed && (
              <span className="json-tree-summary">
                {isArray ? ` ${children.length} 项 ` : ` ${children.length} 个字段 `}
              </span>
            )}
            {isCollapsed || isEmpty ? (isArray ? ']' : '}') : null}
          </span>
        ) : (
          <PrimitiveValue value={value} />
        )}

        {!isLast && <span className="json-tree-comma">,</span>}
      </div>

      {isContainer && !isEmpty && !isCollapsed && (
        <>
          {children.map(([childKey, childValue], index) => (
            <TreeNode
              key={String(childKey)}
              name={childKey}
              value={childValue}
              path={buildJsonPath(path, childKey)}
              depth={depth + 1}
              isLast={index === children.length - 1}
              collapsedPaths={collapsedPaths}
              onToggle={onToggle}
              highlights={highlights}
              inheritedDiff={childDiff}
            />
          ))}
          <div className="json-tree-row json-tree-close" style={indent}>
            {isArray ? ']' : '}'}
            {!isLast && <span className="json-tree-comma">,</span>}
          </div>
        </>
      )}
    </div>
  )
}

export default function JsonTreeView({ value, collapsedPaths, onToggle, highlights }: JsonTreeViewProps) {
  return (
    <div className="json-tree">
      <TreeNode
        value={value}
        path="$"
        depth={0}
        isLast
        collapsedPaths={collapsedPaths}
        onToggle={onToggle}
        highlights={highlights}
      />
    </div>
  )
}
