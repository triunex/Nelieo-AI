import * as k8s from '@kubernetes/client-node';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import yaml from 'js-yaml';

interface WorkspaceRequest {
  userId: string;
  email?: string;
}

interface WorkspaceResponse {
  userId: string;
  workspaceUrl: string;
  status: string;
}

class WorkspaceProvisioner {
  private k8sApi: k8s.AppsV1Api;
  private k8sCoreApi: k8s.CoreV1Api;
  private k8sNetworkingApi: k8s.NetworkingV1Api;
  private config: any;

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    this.k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    this.k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    this.k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

    // Load configuration
    this.config = JSON.parse(fs.readFileSync('/etc/provisioner/config.json', 'utf8'));
  }

  async provisionWorkspace(req: WorkspaceRequest): Promise<WorkspaceResponse> {
    const userId = req.userId || uuidv4();
    const namespace = 'default';

    console.log(`📦 Provisioning workspace for user: ${userId}`);

    try {
      // 1. Create PersistentVolumeClaim
      await this.createPVC(namespace, userId);
      console.log(`✅ Created PVC for user: ${userId}`);

      // 2. Create Deployment
      await this.createDeployment(namespace, userId);
      console.log(`✅ Created Deployment for user: ${userId}`);

      // 3. Create Service
      await this.createService(namespace, userId);
      console.log(`✅ Created Service for user: ${userId}`);

      // 4. Create Ingress
      await this.createIngress(namespace, userId);
      console.log(`✅ Created Ingress for user: ${userId}`);

      const workspaceUrl = `https://${userId}.${this.config.domain}`;

      console.log(`🎉 Workspace provisioned successfully: ${workspaceUrl}`);

      return {
        userId,
        workspaceUrl,
        status: 'provisioned'
      };

    } catch (error) {
      console.error(`❌ Error provisioning workspace for ${userId}:`, error);
      throw error;
    }
  }

  private async createPVC(namespace: string, userId: string): Promise<void> {
    const pvc = {
      metadata: {
        name: `${userId}-pvc`,
        labels: {
          app: 'nelieo-workspace',
          userId: userId
        }
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: this.config.storageSize
          }
        },
        storageClassName: 'standard'
      }
    };

    await this.k8sCoreApi.createNamespacedPersistentVolumeClaim(namespace, pvc);
  }

  private async createDeployment(namespace: string, userId: string): Promise<void> {
    const deployment = {
      metadata: {
        name: `nelieo-workspace-${userId}`,
        labels: {
          app: 'nelieo-workspace',
          userId: userId
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'nelieo-workspace',
            userId: userId
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'nelieo-workspace',
              userId: userId
            }
          },
          spec: {
            containers: [
              {
                name: 'workspace',
                image: this.config.baseImage,
                imagePullPolicy: 'IfNotPresent',
                env: [
                  { name: 'DISPLAY', value: ':100' },
                  { name: 'PORT', value: '10005' },
                  { name: 'USER_ID', value: userId },
                  { name: 'PYTHONUNBUFFERED', value: '1' }
                ],
                ports: [
                  {
                    containerPort: 10005,
                    name: 'xpra-http',
                    protocol: 'TCP'
                  }
                ],
                resources: this.config.defaultResources,
                volumeMounts: [
                  {
                    name: 'screen-agent',
                    mountPath: '/opt/screen-agent',
                    readOnly: true
                  },
                  {
                    name: 'user-data',
                    mountPath: '/root/.config'
                  },
                  {
                    name: 'shm',
                    mountPath: '/dev/shm'
                  }
                ],
                livenessProbe: {
                  httpGet: {
                    path: '/',
                    port: 10005
                  },
                  initialDelaySeconds: 60,
                  periodSeconds: 30,
                  timeoutSeconds: 10,
                  failureThreshold: 3
                },
                readinessProbe: {
                  httpGet: {
                    path: '/',
                    port: 10005
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 10,
                  timeoutSeconds: 5,
                  failureThreshold: 3
                }
              }
            ],
            volumes: [
              {
                name: 'screen-agent',
                hostPath: {
                  path: this.config.screenAgentPath,
                  type: 'Directory'
                }
              },
              {
                name: 'user-data',
                persistentVolumeClaim: {
                  claimName: `${userId}-pvc`
                }
              },
              {
                name: 'shm',
                emptyDir: {
                  medium: 'Memory',
                  sizeLimit: '2Gi'
                }
              }
            ]
          }
        }
      }
    };

    await this.k8sApi.createNamespacedDeployment(namespace, deployment);
  }

  private async createService(namespace: string, userId: string): Promise<void> {
    const service = {
      metadata: {
        name: `nelieo-workspace-${userId}-svc`,
        labels: {
          app: 'nelieo-workspace',
          userId: userId
        }
      },
      spec: {
        type: 'ClusterIP',
        ports: [
          {
            port: 10005,
            targetPort: 10005,
            protocol: 'TCP',
            name: 'xpra-http'
          }
        ],
        selector: {
          app: 'nelieo-workspace',
          userId: userId
        }
      }
    };

    await this.k8sCoreApi.createNamespacedService(namespace, service);
  }

  private async createIngress(namespace: string, userId: string): Promise<void> {
    const ingress = {
      metadata: {
        name: `nelieo-workspace-${userId}-ingress`,
        labels: {
          app: 'nelieo-workspace',
          userId: userId
        },
        annotations: {
          'kubernetes.io/ingress.class': 'nginx',
          'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
          'nginx.ingress.kubernetes.io/proxy-body-size': '100m',
          'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
          'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600'
        }
      },
      spec: {
        tls: [
          {
            hosts: [`${userId}.${this.config.domain}`],
            secretName: `${userId}-tls-cert`
          }
        ],
        rules: [
          {
            host: `${userId}.${this.config.domain}`,
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: `nelieo-workspace-${userId}-svc`,
                      port: {
                        number: 10005
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    };

    await this.k8sNetworkingApi.createNamespacedIngress(namespace, ingress);
  }

  async deleteWorkspace(userId: string): Promise<void> {
    const namespace = 'default';

    console.log(`🗑️  Deleting workspace for user: ${userId}`);

    try {
      // Delete ingress
      await this.k8sNetworkingApi.deleteNamespacedIngress(
        `nelieo-workspace-${userId}-ingress`,
        namespace
      );

      // Delete service
      await this.k8sCoreApi.deleteNamespacedService(
        `nelieo-workspace-${userId}-svc`,
        namespace
      );

      // Delete deployment
      await this.k8sApi.deleteNamespacedDeployment(
        `nelieo-workspace-${userId}`,
        namespace
      );

      // Delete PVC
      await this.k8sCoreApi.deleteNamespacedPersistentVolumeClaim(
        `${userId}-pvc`,
        namespace
      );

      console.log(`✅ Workspace deleted successfully for user: ${userId}`);

    } catch (error) {
      console.error(`❌ Error deleting workspace for ${userId}:`, error);
      throw error;
    }
  }

  async getWorkspaceStatus(userId: string): Promise<any> {
    const namespace = 'default';

    try {
      const deployment = await this.k8sApi.readNamespacedDeployment(
        `nelieo-workspace-${userId}`,
        namespace
      );

      return {
        userId,
        status: deployment.body.status,
        replicas: deployment.body.status?.replicas || 0,
        readyReplicas: deployment.body.status?.readyReplicas || 0,
        workspaceUrl: `https://${userId}.${this.config.domain}`
      };

    } catch (error) {
      console.error(`❌ Error getting workspace status for ${userId}:`, error);
      throw error;
    }
  }
}

// Express API Server
const app = express();
app.use(express.json());

const provisioner = new WorkspaceProvisioner();

// Provision new workspace
app.post('/api/v1/workspace/provision', async (req, res) => {
  try {
    const result = await provisioner.provisionWorkspace(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete workspace
app.delete('/api/v1/workspace/:userId', async (req, res) => {
  try {   
    await provisioner.deleteWorkspace(req.params.userId);
    res.json({ status: 'deleted', userId: req.params.userId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get workspace status
app.get('/api/v1/workspace/:userId/status', async (req, res) => {
  try {
    const status = await provisioner.getWorkspaceStatus(req.params.userId);
    res.json(status);
  } catch (error: any) {
    res.status(404).json({ error: 'Workspace not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Workspace Provisioner API running on port ${PORT}`);
});
