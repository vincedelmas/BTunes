import {ArrowRight} from "lucide-react";
import {tagLabels} from "../../../shared/tags";
import type {TagPreview} from "../../../shared/types/tags";

export function TagPreviewList({ preview }: { preview: TagPreview }) {
    return (
        <section className="tag-preview" aria-label="Tag change preview">
            <div className="preview-heading"><h3>{preview.files.length ? "Ready to save" : "Everything is up to date"}</h3><span>{preview.files.length} file(s)</span></div>
            {preview.files.map((file) => (
                <div className="preview-file" key={file.id}>
                    <strong>{file.title}</strong>
                    <small title={file.path}>{file.path.split("/").at(-1)}</small>
                    {file.changes.map((change) => (
                        <div className="tag-change" key={change.field}>
                            <span>{tagLabels[change.field]}</span>
                            <span>{change.before || "Not set"}</span>
                            <ArrowRight aria-hidden="true"/>
                            <strong>{change.after || "Not set"}</strong>
                        </div>
                    ))}
                </div>
            ))}
        </section>
    );
}
