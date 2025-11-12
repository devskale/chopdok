from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional

class ProjectType(Enum):
    AN = "AN"
    AS = "AS"

class ProjectStatus(Enum):
    TENDER = "TENDER"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    CLOSED = "CLOSED"

@dataclass
class Project:
    id: str
    name: str
    type: ProjectType
    status: ProjectStatus = ProjectStatus.ACTIVE
    version: Optional[str] = None
    lot_number: Optional[str] = None
    company: Optional[str] = None
    other_suffixes: List[str] = field(default_factory=list)
    path: str = ""